
import React, { useState } from 'react';
import { Settings, Zap, Key, Link, Save, CheckCircle2, Lock } from 'lucide-react';
import { ApiKeys } from '../types';

interface SetupWizardProps {
  onComplete: (keys: ApiKeys, password: string) => Promise<{ success: boolean; error?: string }>;
  initialKeys?: ApiKeys | null;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, initialKeys }) => {
  const [keys, setKeys] = useState<ApiKeys>(initialKeys || {
    elevenLabsKey: '',
    elevenLabsAgentId: '',
    n8nWebhookUrl: '',
    n8nApiKey: '',
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    if (!password) {
      setError('Passwort eingeben, um die Änderungen zu speichern.');
      return;
    }
    setSaving(true);
    try {
      const result = await onComplete(keys, password);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateKey = (field: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-900">
      <div className="w-full max-w-2xl p-8 glass rounded-2xl border border-slate-700/60">
        <header className="mb-8 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50">
            <Settings className="text-slate-400" size={22} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-200">Systemkonfiguration</h2>
            <p className="text-slate-500 text-sm">Konfiguriere deine Dienstverbindungen</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ElevenLabs Section */}
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
                    autoComplete="off"
                    className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                    placeholder="xi-api-key..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Agent ID</label>
                <div className="relative">
                  <Zap className="absolute left-3 top-2.5 text-slate-500" size={14} />
                  <input 
                    type="text"
                    value={keys.elevenLabsAgentId}
                    onChange={(e) => updateKey('elevenLabsAgentId', e.target.value)}
                    placeholder="Agent Public ID"
                    autoComplete="off"
                    className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* n8n Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Link size={16} />
              <h3 className="font-medium text-xs uppercase tracking-wider">n8n</h3>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Webhook URL</label>
                <div className="relative">
                  <Link className="absolute left-3 top-2.5 text-slate-500" size={14} />
                  <input 
                    type="url"
                    value={keys.n8nWebhookUrl}
                    onChange={(e) => updateKey('n8nWebhookUrl', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                    placeholder="https://n8n.your-instance.com/..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">API-Schlüssel (Optional)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 text-slate-500" size={14} />
                  <input 
                    type="password"
                    value={keys.n8nApiKey}
                    onChange={(e) => updateKey('n8nApiKey', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                    placeholder="n8n_api_..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/60 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="text-slate-500" size={16} />
            <label className="text-xs text-slate-500">Passwort zum Speichern</label>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500/50"
          />
          {error && <p className="text-amber-200/90 text-sm">{error}</p>}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <CheckCircle2 size={14} className="text-emerald-500/80" />
              4 Kernparameter
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-slate-100 px-5 py-2 rounded-lg font-medium transition-colors"
            >
              <Save size={16} />
              <span>{saving ? 'Speichern…' : 'Speichern'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
