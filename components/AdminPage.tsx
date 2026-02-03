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
} from 'lucide-react';
import { apiService, AdminUser } from '../services/apiService';

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
  const [config, setConfig] = useState({ elevenLabsKey: '', elevenLabsAgentId: '', n8nWebhookUrl: '', n8nApiKey: '' });
  const [configLoading, setConfigLoading] = useState(false);

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
    try {
      const c = await apiService.getUserConfig(u.id);
      setConfig(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setConfigLoading(false);
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
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-100 text-sm font-medium transition-colors"
              >
                <Plus size={18} />
                Neuer Benutzer
              </button>
            </div>

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
                        onChange={(e) => setConfig({ ...config, elevenLabsKey: e.target.value })}
                        className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">ElevenLabs Agent-ID</label>
                      <input
                        type="text"
                        value={config.elevenLabsAgentId}
                        onChange={(e) => setConfig({ ...config, elevenLabsAgentId: e.target.value })}
                        className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">n8n Webhook-URL</label>
                      <input
                        type="url"
                        value={config.n8nWebhookUrl}
                        onChange={(e) => setConfig({ ...config, n8nWebhookUrl: e.target.value })}
                        className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">n8n API-Key (optional)</label>
                      <input
                        type="password"
                        value={config.n8nApiKey}
                        onChange={(e) => setConfig({ ...config, n8nApiKey: e.target.value })}
                        className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
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
        )}
      </div>
    </div>
  );
};

export default AdminPage;
