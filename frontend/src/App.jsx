import React from 'react';
import { useAuth } from "react-oidc-context";
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import { useHealthStore } from './store/useHealthStore';
import ProfileView from './components/ProfileView';
import HomeView from './components/HomeView';

function App() {
  const auth = useAuth(); // هوکِ آمازون کاگنیتو
  const assessment = useHealthStore((state) => state.assessment);
  const currentView = useHealthStore((state) => state.currentView);

  // The store login, and with it the assessment-history fetch, is dispatched from
  // Layout, which is the only component holding the id_token. A second call used to
  // be made here without a token. It always returned 401 at the gateway authorizer,
  // and because both calls wrote to the store unconditionally, whichever finished
  // last won: the unauthenticated one could overwrite a loaded history with an empty
  // list, silently. Every branch below renders inside Layout, so nothing is lost by
  // removing it.

  // صفحه لودینگِ زمانِ اتصال به آمازون
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
         <p className="text-slate-600 font-medium">Connecting to AWS Secure Server...</p>
      </div>
    );
  }

  if (auth.error) {
    return <div className="p-8 text-rose-600">Authentication Error: {auth.error.message}</div>;
  }

  // اگر کاربر لاگین نکرده بود (فرم جدید لاگین متصل به آمازون)
  if (!auth.isAuthenticated) {
    return (
      <Layout>
         <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
                <h2 className="text-2xl font-bold text-deep-blue mb-2">Welcome to WellBeat</h2>
                <p className="text-slate-500 mb-8">Secure your medical data with AWS Cognito.</p>
                <button 
                    onClick={() => auth.signinRedirect()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex justify-center items-center"
                >
                    Sign in / Register
                </button>
            </div>
         </div>
      </Layout>
    );
  }

  // بعد از لاگین موفق: نمایش داشبورد
  if (currentView === 'profile') {
    return (
      <Layout>
        <ProfileView />
      </Layout>
    );
  }

  if (currentView === 'assessment') {
    return (
      <Layout>
        {assessment ? <Dashboard /> : <HomeView />}
      </Layout>
    );
  }

  return (
    <Layout>
      <HomeView />
    </Layout>
  );
}

export default App;