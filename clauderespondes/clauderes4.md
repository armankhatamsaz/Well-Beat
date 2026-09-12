The facts

Network placement. The database sits in the account's default VPC, vpc-03afb752c708dd477, CIDR 172.31.0.0/16. Its subnet group spans all three availability zones, and the instance itself runs in eu-south-1b.

┌──────────────────────────┬─────────────┬────────────────┬──────────┐
│          Subnet          │     AZ      │      CIDR      │ Free IPs │
├──────────────────────────┼─────────────┼────────────────┼──────────┤
│ subnet-082c07f12f86943fe │ eu-south-1b │ 172.31.0.0/20  │ 4090     │
├──────────────────────────┼─────────────┼────────────────┼──────────┤
│ subnet-018d5c825e4617fe6 │ eu-south-1c │ 172.31.16.0/20 │ 4090     │
├──────────────────────────┼─────────────┼────────────────┼──────────┤
│ subnet-08759be0133739e10 │ eu-south-1a │ 172.31.32.0/20 │ 4090     │
└──────────────────────────┴─────────────┴────────────────┴──────────┘

Routing. There is exactly one route table, rtb-01db225381b8008ab, and it is the main table with no explicit subnet associations, so all three subnets inherit it. It carries two routes: 172.31.0.0/16 to local, and 0.0.0.0/0 to igw-05d6eeefe7fbf538c. There is no NAT gateway in this VPC and no VPC endpoints of any kind.

This matters in a way that is easy to get backwards. These are public subnets, but a Lambda elastic network interface never receives a public address, so a function placed here has no route to the internet even though an internet gateway exists. That is acceptable only because the function needs none. It will reach the database over the local route, without touching the gateway.

The inbound rule today. One rule on sg-02ffe13c200596078, TCP 5432 from 0.0.0.0/0. Outbound is open, which is normal and not the concern.

Outbound calls from main.py: none. I checked three independent ways rather than reading the imports and stopping. The import list contains no HTTP client. A search for requests, httpx, boto3, urlopen, urllib.request, socket, http.client and aiohttp across the running source returns nothing. Most conclusively, I downloaded the package that is actually deployed and listed its contents: it bundles no HTTP client library at all, not even urllib3. The only network-capable component in the whole package is psycopg2. The one urllib import is quote_plus, which is string escaping. The Amplify URL in the file is a CORS allow-list entry that is compared against, never fetched. Your statement that token validation happens at the gateway rather than in the function is consistent with everything I can see: the authorizer rejects unauthenticated calls before Lambda is invoked.

The deployed main.py is byte-identical to the working copy, so this analysis describes what is really running.

Capacity. Three ENIs exist in the whole region, all belonging to RDS. The regional quota is 5000. This change needs one Hyperplane ENI per subnet-and-security-group combination, so three at most.

The fact the change depends on. Both enableDnsSupport and enableDnsHostnames are true on the VPC. That is what makes the database endpoint resolve to a private address from inside the VPC. From this machine it currently resolves to the public address 15.161.36.53. If those flags were false the function would resolve the public address, try to leave through the gateway, and time o change is needed.

What I cannot verify, and one trap

I cannot read the execution role. Your .claude/settings.json denies aws iam:*, and the call was blocked. So I cannot confirm that WellBeat-Risk-Engine-role-t9mmq85e carries AWSLambdaVPCAccessExecutionRole, which grants the three EC2 permissions Lambda needs to
create interfaces. This is the single most likely thing to stop Stage 3.

The good news is that it fails safely. Lambda validates those permissions when the configuration update is submitted th InvalidParameterValueException. The function keeps running unchanged and there is no outage. If that happens I will stop and tell you, because fixing it needs an IAM change only you can make.

The trap. Stage 3 passing will not prove the new security group rule works. While the 0.0.0.0/0 rule is still in place it also permits private source addresses, so a VPC-attached function connects successfully whether or not my group-to-group rule is correct.
Keeping both paths open is still the right call, because it protects availability, but it means the real test of the blic rule is removed in Stage 4. I will treat Stage 4 as the actual experiment and verify it immediately.

The plan, and how to undo it

Stage 2, preparation. Create wellbeat-lambda-sg in the VPC with no inbound rules and the default open egress. Add one inbound rule to sg-02ffe13c200596078 allowing TCP 5432 from that group. Leave the public rule alone. Nothing about application behaviour changes.

Stage 3, attachment. Attach the function to all three subnets, including eu-south-1b where the database lives, using Then verify a direct invoke, a gateway POST with a valid token, a history read, and cold and warm latency against therecorded baseline of 3.221 seconds wall clock with 2663 ms init, and 0.125 to 0.152 seconds warm with 9 to 11 ms duration.

Stage 4, closing the door. Revoke the public rule, then immediately prove the application still works through the gatn no longer open a socket to port 5432.

Costs are zero for everything I create. A security group is free, a rule is free, and Lambda-managed Hyperplane ENIs carry no charge. The one genuine cost is cross-zone data transfer when an invocation lands outside eu-south-1b, billed at about USD 0.01 per
gigabyte. At a few kilobytes per request this is far below one cent per month, but it is not literally zero and you sing. No NAT gateway, no VPC endpoint and no elastic IP will be created.

Rollback, in increasing order of speed:

┌─────────────────────┬───────────────────────────────────────────────────────────────────────────────┬─────────────────────┐
│    Step to undo     │                                    Command                                    │ Time to take effect │                                                                                                                                        ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────┼──────────────
│ Stage 4 public rule │ authorize-security-group-ingress re-adding 0.0.0.0/0                          │ about 5 seconds     │
├─────────────────────┼───────────────────────────────────────────────────────────────────────────────┼─────────────────────┤                                                                                                                                        │ Stage 3 attachment  │ update-function-configuration with empty subnet and group lists               │ 60 to 120 sec
├─────────────────────┼───────────────────────────────────────────────────────────────────────────────┼─────────────────────┤
│ Stage 2 preparation │ nothing needs undoing; an unused group changes no behaviour and costs nothing │ not applicable      │                                                                                                                                        └─────────────────────┴───────────────────────────────────────────────────────────────────────────────┴──────────────

The only moment of genuine exposure is the VPC attachment itself, when the function goes into a pending state while its interfaces are created. That window is normally under two minutes. If Stage 3 fails I will detach at once, confirm the application is healthy on the old path, and report without trying a second theory.                                                                                                                                                                                                             
One consequence worth deciding on now rather than discovering later. After Stage 4 this machine loses database access, which is the point, but it also means init_db.py, acid_test.py, latency_test.py and my own synthetic-row cleanup can no longer run from here. Future maintenance would need a temporary rule added and removed again. Separately, the instance keeps PubliclyAccessp closes the door but the public address remains. Setting that flag to false would be the thorough fix, and itmodifies the RDS instance, which this session forbids.

Waiting for your approval before Stage 2.