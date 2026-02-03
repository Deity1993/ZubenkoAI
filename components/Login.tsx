import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/apiService';

interface LoginProps {
  onLogin: (keys: import('../types').ApiKeys, username?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { username: loggedInUser } = await apiService.login(username, password);
      const keys = await apiService.getConfig();
      onLogin(keys, loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Anmeldung.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-900">
      <div className="w-full max-w-md p-8 glass rounded-2xl border border-slate-700/60">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600/50">
            <ShieldCheck className="text-slate-400" size={40} />
          </div>
        </div>
        
        <h1 className="text-2xl font-semibold text-center mb-1 text-slate-200">Anmelden</h1>
        <p className="text-slate-500 text-center mb-6 text-sm">Benutzername und Passwort eingeben</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Benutzername</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-slate-500/50 focus:border-slate-500/50 text-sm"
                placeholder="Benutzername"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-slate-500/50 focus:border-slate-500/50 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-amber-200/90 text-sm">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-slate-100 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-400/40 border-t-slate-300 rounded-full animate-spin" />
            ) : (
              <>
                <span>Anmelden</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
          <p className="text-xs text-slate-500">
            Die Einstellungen werden vom Administrator verwaltet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
