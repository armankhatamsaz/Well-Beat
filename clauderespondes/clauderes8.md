Stage 1 complete. Here is the diagnosis and fix plan. Nothing has been changed.

---

Stage 1 — Diagnosis

Baseline established first

The working tree builds byte-identical to what is live, so any later hash change is attributable to my edits alone:

local  dist/assets/index-qpwO21ns.js   sha256 3a38ba0b416d18ac058c3233ea0701d05b35fb68658abb7df61a6fc1117925ab
live   /assets/index-qpwO21ns.js       sha256 3a38ba0b416d18ac058c3233ea0701d05b35fb68658abb7df61a6fc1117925ab

---

BUG 1 — Logout. Confirmed, reproduced end to end. Your hypothesis is correct.

Root cause. Cognito's discovery document does advertise an end_session_endpoint, so oidc-client-ts happily performs a standard RP-initiated logout against it — but Cognito's /logout is not an OIDC end-session endpoint. It requires client_id plus logout_uri, and it ignores id_token_hint. Given neither, it bounces the browser to /login with the same query string, and /login without client_id/response_type/redirect_uri answers 400.

Evidence 1 — the metadata that misleads the library:

GET https://cognito-idp.eu-south-1.amazonaws.com/eu-south-1_chd7tGAAw/.well-known/openid-configuration
  "end_session_endpoint": "https://eu-south-1chd7tgaaw.auth.eu-south-1.amazoncognito.com/logout"

Evidence 2 — why the URL has only id_token_hint. In oidc-client-ts 3.4.1, SignoutRequest appends client_id only under one condition:

if (!client_id && post_logout_redirect_uri && !id_token_hint) { client_id = this.settings.client_id; }

post_logout_redirect_uri is not configured in src/main.jsx, and id_token_hint is present (taken from the stored user). So both client_id and post_logout_redirect_uri are omitted. That produces exactly the URL you saw.

Evidence 3 — I reproduced the failure against live Cognito with curl:

GET /logout?id_token_hint=DUMMY   -> 302 Found
   Location: .../login?id_token_hint=DUMMY
GET /login?id_token_hint=DUMMY    -> 400 Bad Request

That is your browser's error page, byte for byte.

Evidence 4 — the configuration half. The app client has no sign-out URLs at all:

ClientName    WellBeat-App
CallbackURLs  ["https://main.d184n5jh1hilpp.amplifyapp.com/"]
LogoutURLs    null          <-- empty

So even correct client code would fail today. Confirmed: /logout?client_id=<id>&logout_uri=<the app origin> also 302s to /login and 400s, because that logout_uri is not registered.

Conclusion: two faults, one in configuration and one in code. The configuration fault must be fixed first; it is free and needs no build.

---

BUG 2 — History. Confirmed. The mechanism is worse than a timing window: there are two requests, and one of them can never succeed.

Root cause. Two components call the store's login() on the same commit. Layout.jsx passes the token. App.jsx does not.

frontend/src/components/Layout.jsx:36-39 — with token:
loginStore({ name: finalName, email: profile.email }, auth.user.id_token);

frontend/src/App.jsx:23-26 — no second argument:
loginStore({ name: userName, email: userEmail });

useHealthStore.js:87 then sends Authorization: "":
headers: { "Authorization": token ? `Bearer ${token}` : "" }

Layout is a child of App, so its effect runs first and fires the authorised request; App's effect then runs, sees isAuthenticated still false in the store (nothing has been set yet, the fetch is still in flight), and fires a second, unauthenticated request. Both write to the store unconditionally when they resolve. Whichever finishes last wins.

The 401 branch is silent by construction — response.ok is false, so realHistory stays [] and the store is set with history: [], streak: 0 and no error flag. That is precisely "an empty list rather than an error".

Evidence — both call sites are in the deployed bundle, not just in source:

// Layout, with token
n({name:u,email:c.email},a.user.id_token)
// App, without
i({name:c,email:u})

Evidence — the empty header is rejected exactly as observed:

$ curl -H "Authorization;" .../risk/history/999999
HTTP/1.1 401 Unauthorized
www-authenticate: Bearer scope="" error="invalid_token"
                  error_description="token contains an invalid number of segments"
{"message":"Unauthorized"}

Missing header vs expired token — the evidence supports missing header.

1. error_description="token contains an invalid number of segments" is the empty-string signature. An expired token returns error="invalid_token" error_description="token is expired" — a different string. You can confirm this yourself in one step (see "what to collect" below).
2. It failed on one Edge InPrivate attempt and succeeded on the very next one with the same account. An expired token stays expired until refreshed; it cannot self-heal between two consecutive attempts.
3. InPrivate means a fresh login, so the ID token is seconds old. ID token validity is 60 minutes.
4. Two concurrent requests with a last-writer-wins store is a genuine race, and browser-to-browser differences in connection setup are exactly the kind of thing that flips its outcome.

Expiry is still a real separate concern — validity is 60 minutes, and someone who leaves the tab open through a coffee break will hit it. That is what requirement (b) exists for, and I will handle it.

Tracking prevention is not the cause. You are right to discount it; it does not vary run to run for a same-site fetch.

---

BUG 3 — Chart dimensions. Benign, but I cannot tell you which chart from the message alone.

Root cause of the warning. It is a first-render artefact of recharts 3.5.0, not a layout fault in WellBeat. ResponsiveContainer initialises its measured size to {width: -1, height: -1} and only measures the DOM in a passive effect, after the first render:

// node_modules/recharts/es6/component/ResponsiveContainer.js:48
initialDimension = { width: -1, height: -1 },
...
warn(calculatedWidth > 0 || calculatedHeight > 0, "The width(%s) and height(%s) of chart should be greater than 0, ...")

With both at -1 the condition is false, so the warning fires once on every mount of every ResponsiveContainer. The effect then measures, state updates, and the chart renders at the correct size. The reported minWidth(0), minHeight(undefined), aspect(undefined) are recharts' own defaults, which both of your charts use — so the message is identical for either chart and cannot distinguish them.

It ships in production: recharts hardcodes var isDev = true in its own logger, and I confirmed the warning string survives into index-qpwO21ns.js.

Both containers have a guaranteed non-zero box, so both should render:

┌────────────────────────────────┬──────────────────────────────────────────────────────┬─────────────────────────────────┐
│             Chart              │                      Container                       │            Guarantee            │
├────────────────────────────────┼──────────────────────────────────────────────────────┼─────────────────────────────────┤
│ RiskBreakdown radar (Figure 4) │ flex-1 min-h-[250px] inside h-full flex flex-col     │ min-h-[250px] floors the height │
├────────────────────────────────┼──────────────────────────────────────────────────────┼─────────────────────────────────┤
│ TrendChart area                │ flex-1 w-full min-h-0 inside h-[400px] flex flex-col │ fixed 400 px parent             │
└────────────────────────────────┴──────────────────────────────────────────────────────┴─────────────────────────────────┘

Evidence is not sufficient to name the chart, and this is the one place I will not guess. Both emit the identical message. The two charts live on different screens, so this narrows it: the radar only mounts on the Dashboard (after an assessment) or in the Historical Analysis modal; the trend chart only mounts on Profile.

What I need you to collect — three things, two minutes:

1. Open the site, sign in, run an assessment so the Dashboard with the radar appe
3. In DevTools, click the file:line link on the right-hand side of the warning and tell me the line and column it points to. That resolves it to one chart definitively.

My expectation: both draw correctly, the warning is cosmetic, and Figure 4 is safe. I would rather confirm that than change a chart that is going on your slides.

---

Fix plan

Ordered cheapest and least risky first, exactly as you asked. Three independent changes; any one can be reverted without the others.

Stage 2 — Cognito configuration. No build, effective immediately for all users.

Add https://main.d184n5jh1hilpp.amplifyapp.com/ to the app client's LogoutURLs.

One hazard, which I will handle carefully: update-user-pool-client replaces the entire client configuration, the same trap that update-function-configuration set for the Lambda environment variables in session 2. I have already captured the full current config and will replay every field, then diff before against after and show you the diff. Nothing else changes — callback URL, OAuth flows, scopes, token validity, PreventUserExistenceErrors, EnableTokenRevocation, read/write attributes all carried across verbatim.

I will then re-run the curl probes to confirm which query shape Cognito actually honours before writing any code, rather than assuming.

Stage 3 — Three separable code changes.

Fix 1 — logout. frontend/src/components/Layout.jsx, handleLogout only.

const handleLogout = async () => {
    logoutStore();
    await auth.removeUser();               // clears the local OIDC session
    window.location.assign(               // Cognito's own sign-out, not RP-initiated
        `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`
    );
};

Replaces auth.signoutRedirect(). Roughly 8 lines. No refactor of the auth flow, no change to main.jsx, no visual change.

Fix 2 — history request. Three small edits:

- App.jsx: delete the duplicate useEffect that calls loginStore without a token (6 lines). Layout already does this correctly with the token, and every branch of App renders inside Layout, so no code path loses its login call.
- Layout.jsx: tighten the guard to require auth.user.id_token, and pass a refresh callback (() => auth.signinSilent()).
- useHealthStore.js: on HTTP 401, call the refresh callback once and retry. signinSilent() uses the refresh token, which this client supports (ALLOW_REFRESH_TOKEN_AUTH, 5-day validity), so it is a token exchange and not an iframe or a redirect.

One visible side effect I want to flag rather than hide: users whose Cognito profile has given_name but no name may see a slightly different display name, because Layout's naming logic will now always win the race instead of sometimes. Layout's logic is the better of the two.

Fix 3 — history error message. A new historyError field in the store (null / 'expired' / 'failed') and one small banner rendered in Layout above {children}, so it is visible on every screen rather than only on Profile:

- 401 that survives the retry → "Your session has expired." plus a Sign in again button.
- Any other failure or network error → "We could not load your assessment history."
- No error and zero rows → nothing shown; an empty list then genuinely means no assessments.

This is additive. It does not alter any existing layout, colour or component.

Bug 3 — my recommendation is no code change, pending your three data points above. The only way to silence the warning is to hand ResponsiveContainer an initialDimension, which makes it paint the chart at a wrong size for one frame before correcting. Trading a console line nobody in the audience will see for a possible visible flash in Figure 4 is a bad trade five days out. If your check shows the chart actually failing to appear, that is a different finding and I will treat it as one.

Stage 4 — Verify and hand back.

Local build, confirm it succeeds, confirm the new bundle hash, and give you the numbered Edge/Chrome/mobile checklist including a step that deliberately provokes an expired session.

Not doing

VPC, security groups, RDS, reserved concurrency, main.py, the risk engine, the Pydantic schema. No commits, no pushes. I will tell you what to commit.

---

One question before I start

Should I also add http://localhost:5173/ to the sign-out URLs? It costs nothing and would make local logout work. Against it: local login does not work either, because localhost is not in CallbackURLs, and adding that is a wider change I would rather not make this week. My recommendation is production origin only — but it is your call, and it is cheaper to do it in the same single write than in a second one.

Tell me to proceed and I will start with Stage 2.