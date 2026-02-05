import React, { useState, useEffect } from 'react';
import { X, Settings, Save, AlertCircle, CheckCircle2, Eye, EyeOff, Upload } from 'lucide-react';
import { sipService } from '../services/sipService';
import { SIPConfig } from '../types';

interface SIPSettingsProps {
  onClose: () => void;
}

const SIPSettings: React.FC<SIPSettingsProps> = ({ onClose }) => {
  const [registrar, setRegistrar] = useState('');
  const [port, setPort] = useState('5060');
  const [protocol, setProtocol] = useState<'TCP' | 'TLS'>('TCP');
  const [websocketUrl, setWebsocketUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [certificatePath, setCertificatePath] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Lade aktuelle Konfiguration
    const config = sipService.getConfig();
    if (config) {
      setRegistrar(config.registrar);
      setPort(config.port.toString());
      setProtocol(config.protocol);
      setWebsocketUrl(config.websocketUrl || '');
      setUsername(config.username);
      setPassword(config.password);
      setDisplayName(config.displayName || '');
      setCertificatePath(config.certificatePath || '');
    }
    setIsRegistered(sipService.isRegistered());
  }, []);

  const handlePortChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 65535) {
      setPort(value);
    }
  };

  const handleProtocolChange = (newProtocol: 'TCP' | 'TLS') => {
    setProtocol(newProtocol);
    if (newProtocol === 'TCP' && port === '5061') {
      setPort('5060');
    } else if (newProtocol === 'TLS' && port === '5060') {
      setPort('5061');
    }
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await sipService.handleCertificate(file);
    if (result.success) {
      setCertificatePath(file.name);
      setStatusMessage({ type: 'success', message: result.message });
    } else {
      setStatusMessage({ type: 'error', message: result.message });
    }
  };

  const handleRegister = async () => {
    // Validierung
    if (!registrar.trim()) {
      setStatusMessage({ type: 'error', message: 'Bitte Registrar-Adresse eingeben' });
      return;
    }

    if (!username.trim()) {
      setStatusMessage({ type: 'error', message: 'Bitte Benutzername eingeben' });
      return;
    }

    if (!password.trim()) {
      setStatusMessage({ type: 'error', message: 'Bitte Passwort eingeben' });
      return;
    }

    // TLS-Zertifikat wird nur für direkte SIP/TLS-Verbindungen benötigt.
    // Bei WebSocket/WSS übernimmt der Server das Zertifikat.

    setIsRegistering(true);
    setStatusMessage(null);

    const config: SIPConfig = {
      registrar: registrar.trim(),
      port: parseInt(port, 10),
      protocol,
      websocketUrl: websocketUrl.trim() || undefined,
      username: username.trim(),
      password,
      displayName: displayName.trim() || username.trim(),
      certificatePath: certificatePath || undefined
    };

    const result = await sipService.register(config);
    setIsRegistering(false);

    if (result.success) {
      setStatusMessage({ type: 'success', message: result.message });
      setIsRegistered(true);
    } else {
      setStatusMessage({ type: 'error', message: result.message });
    }
  };

  const handleUnregister = async () => {
    await sipService.unregister();
    setIsRegistered(false);
    setStatusMessage({ type: 'info', message: 'SIP-Registrierung beendet' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700/60 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800/50 border-b border-slate-700/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-100">SIP-Nebenstelle Konfiguration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Indicator */}
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${
            isRegistered 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {isRegistered ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">
              {isRegistered ? 'SIP-Nebenstelle registriert' : 'SIP-Nebenstelle nicht registriert'}
            </span>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : statusMessage.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}>
              {statusMessage.type === 'success' && <CheckCircle2 size={16} />}
              {statusMessage.type === 'error' && <AlertCircle size={16} />}
              {statusMessage.message}
            </div>
          )}

          {/* Registrar Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Registrar-Einstellungen</h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Registrar-Adresse</label>
              <input
                type="text"
                value={registrar}
                onChange={(e) => setRegistrar(e.target.value)}
                placeholder="z.B. sip.example.com oder 192.168.1.100"
                className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              />
              <p className="text-xs text-slate-500 mt-1">IP-Adresse oder Hostname des SIP-Registrars</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => handlePortChange(e.target.value)}
                  min="1"
                  max="65535"
                  className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Protokoll</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProtocolChange('TCP')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      protocol === 'TCP'
                        ? 'bg-slate-600 text-slate-100'
                        : 'bg-slate-800/60 border border-slate-600/60 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    TCP (5060)
                  </button>
                  <button
                    onClick={() => handleProtocolChange('TLS')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      protocol === 'TLS'
                        ? 'bg-slate-600 text-slate-100'
                        : 'bg-slate-800/60 border border-slate-600/60 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    TLS (5061)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">WebSocket-URL</label>
              <input
                type="text"
                value={websocketUrl}
                onChange={(e) => setWebsocketUrl(e.target.value)}
                placeholder="z.B. wss://sip.provider.com:8089/ws"
                className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              />
              <p className="text-xs text-slate-500 mt-1">
                Viele Provider nutzen einen separaten WebSocket-Endpunkt, der sich vom Registrar unterscheidet.
              </p>
            </div>
          </div>

          {/* Authentification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Authentifizierung</h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Benutzername</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="z.B. 101 oder benutzer@example.com"
                className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="SIP-Passwort"
                  className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg px-4 py-2 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Anzeigename (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="z.B. Mein Telefon"
                className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              />
            </div>
          </div>

          {/* TLS Certificate */}
          {protocol === 'TLS' && (
            <div className="space-y-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-100">TLS-Zertifikat</h3>
              
              {certificatePath ? (
                <div className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-600/60 rounded">
                  <div>
                    <p className="text-sm font-medium text-emerald-400">✓ Zertifikat installiert</p>
                    <p className="text-xs text-slate-400">{certificatePath}</p>
                  </div>
                  <button
                    onClick={() => setCertificatePath('')}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white transition-colors"
                  >
                    Entfernen
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center border-2 border-dashed border-slate-600/60 rounded-lg p-6 cursor-pointer hover:border-slate-500 hover:bg-slate-800/30 transition-colors">
                  <div className="text-center">
                    <Upload size={24} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-300">Zertifikat hochladen</p>
                    <p className="text-xs text-slate-500 mt-1">Formate: .pem, .crt, .cer</p>
                  </div>
                  <input
                    type="file"
                    accept=".pem,.crt,.cer"
                    onChange={handleCertificateUpload}
                    className="hidden"
                  />
                </label>
              )}
              
              <p className="text-xs text-slate-400">
                Für sichere TLS-Verbindungen (Port 5061) ist ein Zertifikat erforderlich. 
                Nutzen Sie ein selbstsigniertes oder von einer CA signiertes Zertifikat.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            {isRegistered ? (
              <button
                onClick={handleUnregister}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors"
              >
                Registrierung beenden
              </button>
            ) : (
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRegistering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird registriert…
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Registrieren
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 font-semibold transition-colors"
            >
              Schließen
            </button>
          </div>

          {/* Info */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-lg space-y-2 text-xs text-slate-400">
            <p className="font-medium text-slate-300">Hinweise:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>TCP (Port 5060): Unverschlüsselte Verbindung</li>
              <li>TLS (Port 5061): Verschlüsselte Verbindung mit Zertifikat</li>
              <li>Die Einstellungen werden lokal gespeichert</li>
              <li>Kontaktiere deinen SIP-Provider für die genauen Einstellungen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SIPSettings;
