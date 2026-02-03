import React, { useState, useEffect } from 'react';
import { ApiKeys, AppState } from './types';
import { apiService, isAdminUser } from './services/apiService';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const config = await apiService.getConfig();
        setKeys(config);
        setAppState(AppState.DASHBOARD);
        try {
          const me = await apiService.getMe();
          setIsAdmin(!!me.isAdmin);
        } catch {
          setIsAdmin(isAdminUser());
        }
      } catch {
        setAppState(AppState.AUTH);
      }
    };
    init();
  }, []);

  const handleLogin = (config: ApiKeys) => {
    setKeys(config);
    setAppState(AppState.DASHBOARD);
    setIsAdmin(isAdminUser());
  };

  const handleLogout = () => {
    apiService.clearToken();
    setKeys(null);
    setIsAdmin(false);
    setAppState(AppState.AUTH);
  };

  if (appState === AppState.ADMIN) {
    return (
      <AdminPage
        onBack={() => setAppState(AppState.DASHBOARD)}
        onLogout={handleLogout}
      />
    );
  }

  if (appState === AppState.DASHBOARD && keys) {
    return (
      <Dashboard
        keys={keys}
        onLogout={handleLogout}
        onOpenSettings={undefined}
        onOpenAdmin={isAdmin ? () => setAppState(AppState.ADMIN) : undefined}
      />
    );
  }

  return <Login onLogin={handleLogin} />;
};

export default App;
