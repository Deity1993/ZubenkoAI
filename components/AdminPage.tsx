import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ArrowLeft,
  Plus,
  Lock,
  Unlock,
  Shield,
  ShieldOff,
  Key,
  Settings,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
} from 'lucide-react';
import { apiService, AdminUser } from '../services/apiService';
import { elevenLabsService } from '../services/elevenLabsService';

interface AdminPageProps {
  username?: string;
  onBack: () => void;
  onLogout: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ username, onBack, onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [configUser, setConfigUser] = useState<AdminUser | null>(null);
  const [config, setConfig] = useState({ elevenLabsKey: '', elevenLabsAgentId: '', elevenLabsChatAgentId: '' });
  const [configLoading, setConfigLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ elevenLabs?: { ok: boolean; message: string }; elevenLabsChat?: { ok: boolean; message: string } } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: string[]; updated: string[]; errors: string[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(async () => {
    try {
      setError('');
      const list = await apiService.getAdminUsers();
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    setAddLoading(true);
    setError('');
    try {
      await apiService.createUser(newUsername.trim(), newPassword);
      setNewUsername('');
      setNewPassword('');
      setShowAdd(false);
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateUser = async (id: number, updates: { password?: string; isLocked?: boolean; isAdmin?: boolean }) => {
    setEditLoading(true);
    setError('');
    try {
      await apiService.updateUser(id, updates);
      setEditingUser(null);
      setEditPassword('');
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleLock = (u: AdminUser) => {
    handleUpdateUser(u.id, { isLocked: !u.isLocked });
  };

  const handleToggleAdmin = (u: AdminUser) => {
    handleUpdateUser(u.id, { isAdmin: !u.isAdmin });
  };

  const openConfig = async (u: AdminUser) => {
    setConfigUser(u);
    setConfigLoading(true);
    setTestResult(null);
    try {
      const c = await apiService.getUserConfig(u.id);
      setConfig(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setConfigLoading(false);
    }
  };

  const testConnections = async () => {
    setTestResult(null);
    const results: typeof testResult = {};
    if (config.elevenLabsAgentId?.trim()) {
      const r = await elevenLabsService.testConnection(config.elevenLabsAgentId, config.elevenLabsKey);
      results.elevenLabs = r;
    }
    if (config.elevenLabsChatAgentId?.trim()) {
      const r = await elevenLabsService.testConnection(config.elevenLabsChatAgentId, config.elevenLabsKey);
      results.elevenLabsChat = r;
    }
    if (Object.keys(results).length === 0) {
      setTestResult({ elevenLabs: { ok: false, message: 'Mindestens eine Agent-ID eingeben, dann Prüfen.' } });
    } else {
      setTestResult(results);
    }
  };

  const saveConfig = async () => {
    if (!configUser) return;
    setConfigLoading(true);
    setError('');
    try {
      await apiService.setUserConfig(configUser.id, config);
      setConfigUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setError('');
    try {
      const blob = await apiService.exportUsersCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zubenkoai-users.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export fehlgeschlagen');
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setError('');
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await apiService.importUsersCsv(text);
      setImportResult(result);
      if (result.created.length > 0 || result.updated.length > 0) {
        loadUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import fehlgeschlagen');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-800/60 border border-slate-600/60 hover:bg-slate-700/60 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Users size={24} className="text-slate-400" />
              <h1 className="text-xl font-semibold">Benutzerverwaltung</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {username && (
              <span className="text-sm text-slate-500">
                Angemeldet als <span className="text-slate-300 font-medium">{username}</span>
              </span>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-200 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-end gap-2 mb-4">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
              >
                <Download size={18} />
                CSV exportieren
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCsv}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium transition-colors"
              >
                {importLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                CSV importieren
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-100 text-sm font-medium transition-colors"
              >
                <Plus size={18} />
                Neuer Benutzer
              </button>
            </div>

            {importResult && (
              <div className="mb-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <h4 className="text-sm font-medium text-slate-400">Import-Ergebnis</h4>
                {importResult.created.length > 0 && (
                  <p className="text-sm text-emerald-400">Angelegt: {importResult.created.join(', ')}</p>
                )}
                {importResult.updated.length > 0 && (
                  <p className="text-sm text-sky-400">Aktualisiert: {importResult.updated.join(', ')}</p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="text-sm text-amber-400">
                    <p className="font-medium mb-1">Fehler:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => setImportResult(null)}
                  className="text-xs text-slate-500 hover:text-slate-400"
                >
                  Schließen
                </button>
              </div>
            )}

            {showAdd && (
              <div className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Neuen Benutzer anlegen</h3>
                <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Benutzername"
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Passwort"
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={addLoading || !newUsername.trim() || !newPassword.trim()}
                      className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-sm font-medium"
                    >
                      {addLoading ? <Loader2 size={18} className="animate-spin" /> : 'Anlegen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAdd(false); setNewUsername(''); setNewPassword(''); }}
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="space-y-2">
                  <div
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-200">{u.username}</span>
                      {u.isAdmin && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-900/40 text-amber-300 border border-amber-700/50">
                          Admin
                        </span>
                      )}
                      {u.isLocked && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-900/40 text-red-300 border border-red-700/50">
                          Gesperrt
                        </span>
                      )}
                      <span className="text-xs text-slate-500">ID {u.id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openConfig(u)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
                        title="Konfiguration"
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={() => handleToggleLock(u)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
                        title={u.isLocked ? 'Entsperren' : 'Sperren'}
                      >
                        {u.isLocked ? <Unlock size={18} /> : <Lock size={18} />}
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(u)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
                        title={u.isAdmin ? 'Admin entziehen' : 'Zum Admin machen'}
                      >
                        {u.isAdmin ? <ShieldOff size={18} /> : <Shield size={18} />}
                      </button>
                      <button
                        onClick={() => setEditingUser(editingUser?.id === u.id ? null : u)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
                        title="Passwort ändern"
                      >
                        <Key size={18} />
                      </button>
                    </div>
                  </div>
                  {editingUser?.id === u.id ? (
                    <div className="ml-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 flex gap-2">
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Neues Passwort"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => editPassword.trim() && handleUpdateUser(u.id, { password: editPassword })}
                        disabled={editLoading || !editPassword.trim()}
                        className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-sm"
                      >
                        {editLoading ? <Loader2 size={16} className="animate-spin" /> : 'Speichern'}
                      </button>
                      <button
                        onClick={() => { setEditingUser(null); setEditPassword(''); }}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-sm"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}

        {configUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="font-medium">Konfiguration: {configUser.username}</h3>
                <button
                  onClick={() => setConfigUser(null)}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {configLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-slate-500" />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">ElevenLabs API-Key</label>
                      <input
                        type="password"
                        value={config.elevenLabsKey}
                        onChange={(e) => { setConfig({ ...config, elevenLabsKey: e.target.value }); setTestResult(null); }}
                        className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">ElevenLabs Agent-ID (Sprache)</label>
                      <input
                        type="text"
                        value={config.elevenLabsAgentId}
                        onChange={(e) => { setConfig({ ...config, elevenLabsAgentId: e.target.value }); setTestResult(null); }}
                        placeholder="Für Sprachmodus"
                        className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">ElevenLabs Agent-ID (Chat)</label>
                      <input
                        type="text"
                        value={config.elevenLabsChatAgentId}
                        onChange={(e) => { setConfig({ ...config, elevenLabsChatAgentId: e.target.value }); setTestResult(null); }}
                        placeholder="Für Text/Chat-Modus"
                        className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    {testResult && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        {testResult.elevenLabs && (
                          <div className={`flex items-start gap-2 text-sm ${testResult.elevenLabs.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {testResult.elevenLabs.ok ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                            <span>Sprache: {testResult.elevenLabs.message}</span>
                          </div>
                        )}
                        {testResult.elevenLabsChat && (
                          <div className={`flex items-start gap-2 text-sm ${testResult.elevenLabsChat.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {testResult.elevenLabsChat.ok ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                            <span>Chat: {testResult.elevenLabsChat.message}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-4 border-t border-slate-700 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={testConnections}
                  disabled={configLoading}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm font-medium"
                >
                  Verbindung prüfen
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfigUser(null)}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-sm"
                  >
                    Schließen
                  </button>
                  <button
                    onClick={saveConfig}
                    disabled={configLoading}
                    className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-sm font-medium"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
