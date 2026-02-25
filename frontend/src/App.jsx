import React from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { useHealthStore } from './store/useHealthStore';

import ProfileView from './components/ProfileView';

import HomeView from './components/HomeView';

function App() {
  const assessment = useHealthStore((state) => state.assessment);
  const isAuthenticated = useHealthStore((state) => state.isAuthenticated);
  const currentView = useHealthStore((state) => state.currentView);

  if (!isAuthenticated) {
    return (
      <Layout>
        <Login />
      </Layout>
    );
  }

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

  // Default to Home Dashboard
  return (
    <Layout>
      <HomeView />
    </Layout>
  );
}

export default App;
