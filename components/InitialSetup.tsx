import React, { useState } from 'react';
import { Lock, Settings, Zap, Key, Save, ShieldCheck } from 'lucide-react';
import { ApiKeys } from '../types';

interface InitialSetupProps {
  onComplete: (keys: ApiKeys, password: string) => void;
  legacyKeys?: ApiKeys | null;
}

const InitialSetup: React.FC<InitialSetupProps> = ({ onComplete, legacyKeys }) => {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [keys, setKeys] = useState<ApiKeys>(legacyKeys || {
    elevenLabsKey: '',
    elevenLabsAgentId: '',
    elevenLabsChatAgentId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateKey = (field: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      onComplete(keys, password);
    } catch (err) {
      setError('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-900">
      <div className="w-full max-w-2xl p-8 glass rounded-2xl border border-slate-700/60">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600/50">
            <ShieldCheck className="text-slate-400" size={40} />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-center mb-1 text-slate-200">Ersteinrichtung</h1>
        <p className="text-slate-500 text-center mb-6 text-sm">
          Lege ein Passwort fest und konfiguriere die Verbindungen. Die Daten werden verschlüsselt gespeichert.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 p-4 rounded-lg bg-slate-800/40 border border-slate-700/60">
            <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Lock size={16} />
              Passwort festlegen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Passwort (min. 6 Zeichen)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Passwort bestätigen</label>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Settings size={16} />
              Verbindungen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Zap size={16} />
                  <h3 className="font-medium text-xs uppercase tracking-wider">ElevenLabs</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500">API Key</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 text-slate-500" size={14} />
                      <input
                        type="password"
                        value={keys.elevenLabsKey}
                        onChange={(e) => updateKey('elevenLabsKey', e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                        placeholder="xi-api-key..."
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500">Agent-ID (Sprache)</label>
                    <div className="relative">
                      <Zap className="absolute left-3 top-2.5 text-slate-500" size={14} />
                      <input
                        type="text"
                        value={keys.elevenLabsAgentId}
                        onChange={(e) => updateKey('elevenLabsAgentId', e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                        placeholder="Für Sprachmodus"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500">Agent-ID (Chat)</label>
                    <div className="relative">
                      <Zap className="absolute left-3 top-2.5 text-slate-500" size={14} />
                      <input
                        type="text"
                        value={keys.elevenLabsChatAgentId}
                        onChange={(e) => updateKey('elevenLabsChatAgentId', e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                        placeholder="Für Text/Chat-Modus"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-amber-200/90 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-slate-100 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={18} />
            <span>Einrichtung abschließen</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default InitialSetup;
