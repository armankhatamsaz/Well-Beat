import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from "react-oidc-context"
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// تنظیمات امنیتی آمازون کاگنیتو
const cognitoAuthConfig = {
  authority: "https://cognito-idp.eu-south-1.amazonaws.com/eu-south-1_chd7tGAAw",
  client_id: "1fsqemb8fhmhon198oafnbv48u",
  redirect_uri: "https://main.d184n5jh1hilpp.amplifyapp.com/",
  response_type: "code",
  scope: "phone openid email profile", // کلمه profile اضافه شد!
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {/* بادیگارد آمازون کل اپلیکیشن رو در بر می‌گیره */}
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)