import React, { useState, useEffect } from 'react';
import { ApiKeys, AppState } from './types';
import { apiService } from './services/apiService';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [keys, setKeys] = useState<ApiKeys | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const config = await apiService.getConfig();
        setKeys(config);
        setAppState(AppState.DASHBOARD);
      } catch {
        setAppState(AppState.AUTH);
      }
    };
    init();
  }, []);

  const handleLogin = (config: ApiKeys) => {
    setKeys(config);
    setAppState(AppState.DASHBOARD);
  };

  const handleLogout = () => {
    apiService.clearToken();
    setKeys(null);
    setAppState(AppState.AUTH);
  };

  if (appState === AppState.DASHBOARD && keys) {
    return (
      <Dashboard
        keys={keys}
        onLogout={handleLogout}
        onOpenSettings={undefined}
      />
    );
  }

  return <Login onLogin={handleLogin} />;
};

export default App;
