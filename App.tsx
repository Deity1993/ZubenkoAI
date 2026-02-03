import React, { useState, useEffect } from 'react';
import { ApiKeys, AppState } from './types';
import { apiService, isAdminUser, getUsername } from './services/apiService';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const config = await apiService.getConfig();
        setKeys(config);
        setAppState(AppState.DASHBOARD);
        try {
          const me = await apiService.getMe();
          setIsAdmin(!!me.isAdmin);
          setUsername(me.username || getUsername());
        } catch {
          setIsAdmin(isAdminUser());
          setUsername(getUsername());
        }
      } catch {
        setAppState(AppState.AUTH);
      }
    };
    init();
  }, []);

  const handleLogin = (config: ApiKeys, loggedInUsername?: string) => {
    setKeys(config);
    setAppState(AppState.DASHBOARD);
    setIsAdmin(isAdminUser());
    setUsername(loggedInUsername || getUsername());
  };

  const handleLogout = () => {
    apiService.clearToken();
    setKeys(null);
    setIsAdmin(false);
    setUsername('');
    setAppState(AppState.AUTH);
  };

  if (appState === AppState.ADMIN) {
    return (
      <AdminPage
        username={username}
        onBack={() => setAppState(AppState.DASHBOARD)}
        onLogout={handleLogout}
      />
    );
  }

  if (appState === AppState.DASHBOARD && keys) {
    return (
      <Dashboard
        keys={keys}
        username={username}
        onLogout={handleLogout}
        onOpenSettings={undefined}
        onOpenAdmin={isAdmin ? () => setAppState(AppState.ADMIN) : undefined}
      />
    );
  }

  return <Login onLogin={(keys, u) => handleLogin(keys, u)} />;
};

export default App;
