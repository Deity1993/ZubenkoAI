import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MessageSquare, Power, Settings, LogOut, Activity, Command, Waves, Users } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { ApiKeys, InteractionMode, ChatMessage } from '../types';
import WaveformVisualizer from './WaveformVisualizer';
import { elevenLabsService } from '../services/elevenLabsService';

interface DashboardProps {
  keys: ApiKeys;
  username?: string;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ keys, username, onLogout, onOpenSettings, onOpenAdmin }) => {
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.VOICE);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const waitingForChatResponseRef = useRef(false);
  const chatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: ChatMessage['role'], content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const ensureTextSessionRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const userMsg = inputValue;
    setInputValue('');
    addMessage('user', userMsg);
    setIsProcessing(true);
    waitingForChatResponseRef.current = true;

    try {
      await ensureTextSessionRef.current();
      sendUserMessage(userMsg);
      chatTimeoutRef.current = setTimeout(() => {
        if (waitingForChatResponseRef.current) {
          waitingForChatResponseRef.current = false;
          setIsProcessing(false);
          addMessage('system', 'Keine Antwort vom Agent erhalten. Bitte erneut versuchen.');
        }
        chatTimeoutRef.current = null;
      }, 60000);
    } catch (error) {
      waitingForChatResponseRef.current = false;
      if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
      chatTimeoutRef.current = null;
      setIsProcessing(false);
      let msg = error instanceof Error ? error.message : 'Verbindung zu ElevenLabs fehlgeschlagen.';
      if (msg === 'Failed to fetch') {
        msg = 'Verbindung fehlgeschlagen. Mögliche Ursachen: Netzwerkproblem, blockierte Anfrage (Adblocker/Firewall), ElevenLabs API nicht erreichbar. Bitte Konsole (F12) prüfen.';
      }
      addMessage('system', msg);
    }
  };

  const handleVoiceMessage = useCallback((transcript: string) => {
    if (!transcript?.trim()) return;
    addMessage('user', transcript);
  }, []);

  const {
    startSession,
    endSession,
    status: conversationStatus,
    isSpeaking,
    sendUserMessage,
    sendUserActivity,
  } = useConversation({
    textOnly: mode === InteractionMode.TEXT,
    onMessage: (props) => {
      if (props.role === 'user' && props.message?.trim()) {
        handleVoiceMessage(props.message);
      }
      const role = String(props.role ?? '');
      if ((role === 'agent' || role === 'assistant') && props.message?.trim() && waitingForChatResponseRef.current) {
        waitingForChatResponseRef.current = false;
        if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = null;
        setIsProcessing(false);
        addMessage('assistant', props.message);
      }
    },
    onConnect: () => {
      setVoiceError(null);
      if (mode === InteractionMode.VOICE) {
        addMessage('system', 'Sprachverbindung hergestellt. Always-on-Modus aktiv.');
      }
    },
    onDisconnect: () => {
      setIsVoiceActive(false);
      addMessage('system', 'Sprachverbindung beendet.');
    },
    onError: (message: string) => {
      setVoiceError(message);
      addMessage('system', `Fehler: ${message}`);
      setIsVoiceActive(false);
      if (waitingForChatResponseRef.current) {
        waitingForChatResponseRef.current = false;
        if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = null;
        setIsProcessing(false);
      }
    },
  });

  const conversationStatusRef = useRef(conversationStatus);
  conversationStatusRef.current = conversationStatus;

  ensureTextSessionRef.current = useCallback(async () => {
    if (conversationStatusRef.current === 'connected') return;
    const chatAgentId = keys.elevenLabsChatAgentId?.trim();
    if (!chatAgentId) {
      throw new Error('Bitte konfiguriere die ElevenLabs Chat-Agent-ID in den Admin-Einstellungen.');
    }
    setIsConnecting(true);
    setVoiceError(null);
    try {
      if (keys.elevenLabsKey?.trim()) {
        const signedUrl = await elevenLabsService.getSignedUrl(chatAgentId, keys.elevenLabsKey);
        await startSession({ signedUrl, connectionType: 'websocket' });
      } else {
        await startSession({ agentId: chatAgentId, connectionType: 'webrtc' });
      }
      const maxWait = 10000;
      const start = Date.now();
      while (conversationStatusRef.current !== 'connected' && Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (conversationStatusRef.current !== 'connected') {
        throw new Error('Verbindung zu ElevenLabs konnte nicht hergestellt werden.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [keys.elevenLabsChatAgentId, keys.elevenLabsKey, startSession]);

  const toggleVoice = async () => {
    if (isVoiceActive) {
      await endSession();
      setIsVoiceActive(false);
      return;
    }

    if (!keys.elevenLabsAgentId?.trim()) {
      addMessage('system', 'Bitte konfiguriere die ElevenLabs Agent ID in den Einstellungen.');
      return;
    }

    setIsConnecting(true);
    setVoiceError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setVoiceError('Mikrofon-Zugriff wurde verweigert.');
      addMessage('system', 'Mikrofon-Zugriff wurde verweigert. Erlaube den Zugriff in den Browser-Einstellungen.');
      setIsConnecting(false);
      return;
    }

    try {
      if (keys.elevenLabsKey?.trim()) {
        const signedUrl = await elevenLabsService.getSignedUrl(keys.elevenLabsAgentId, keys.elevenLabsKey);
        await startSession({
          signedUrl,
          connectionType: 'websocket',
        });
      } else {
        await startSession({
          agentId: keys.elevenLabsAgentId,
          connectionType: 'webrtc',
        });
      }
      setIsVoiceActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verbindung zu ElevenLabs fehlgeschlagen.';
      setVoiceError(msg);
      addMessage('system', `ElevenLabs-Fehler: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 md:w-24 bg-slate-800/50 border-r border-slate-700/60 flex flex-col items-center py-6 justify-between">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-11 h-11 bg-slate-600 rounded-xl flex items-center justify-center">
            <Command className="text-slate-200" size={22} />
          </div>
          
          <nav className="flex flex-col space-y-1">
            <button 
              onClick={() => setMode(InteractionMode.VOICE)}
              className={`p-2.5 rounded-lg transition-colors ${mode === InteractionMode.VOICE ? 'bg-slate-600/50 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'}`}
              title="Sprachmodus"
            >
              <Mic size={22} />
            </button>
            <button 
              onClick={() => setMode(InteractionMode.TEXT)}
              className={`p-2.5 rounded-lg transition-colors ${mode === InteractionMode.TEXT ? 'bg-slate-600/50 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'}`}
              title="Textmodus"
            >
              <MessageSquare size={22} />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center space-y-1">
          {onOpenAdmin && (
            <button onClick={onOpenAdmin} className="p-2.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors" title="Benutzerverwaltung">
              <Users size={22} />
            </button>
          )}
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="p-2.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors">
              <Settings size={22} />
            </button>
          )}
          <button onClick={onLogout} className="p-2.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors">
            <LogOut size={22} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-slate-900">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-700/60 flex items-center justify-between px-6 bg-slate-800/30">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
            <span className="text-sm font-medium text-slate-400">Orchestrator aktiv</span>
          </div>
          
          <div className="flex items-center gap-3">
            {username && (
              <span className="text-sm text-slate-500">
                Angemeldet als <span className="text-slate-300 font-medium">{username}</span>
              </span>
            )}
            <div className="px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-slate-500 flex items-center">
              <Activity size={12} className="mr-2 text-slate-500" />
              SYSTEM
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {mode === InteractionMode.VOICE ? (
            <div className="h-full flex flex-col items-center justify-center space-y-10">
              <div className="relative">
                <button 
                  onClick={toggleVoice}
                  disabled={isConnecting}
                  className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed ${isVoiceActive ? 'bg-slate-600 text-slate-100 border-2 border-slate-500/50' : 'bg-slate-800/80 text-slate-400 border border-slate-600/60 hover:border-slate-500 hover:bg-slate-700/80'}`}
                >
                  {isConnecting ? (
                    <div className="w-7 h-7 border-2 border-slate-400/40 border-t-slate-300 rounded-full animate-spin" />
                  ) : isVoiceActive ? (
                    <Power size={56} />
                  ) : (
                    <Mic size={56} />
                  )}
                </button>
                {isVoiceActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500/90" />
                )}
              </div>

              <div className="text-center space-y-3 max-w-md">
                <h3 className="text-xl font-medium text-slate-200">
                  {isConnecting ? 'Verbinde…' : isVoiceActive ? (isSpeaking ? 'Agent spricht…' : 'Höre zu…') : 'Drücken zum Sprechen'}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {isConnecting 
                    ? 'Verbindung zu ElevenLabs wird hergestellt…'
                    : isVoiceActive 
                      ? 'Deine Sprache wird transkribiert und der ElevenLabs-Agent antwortet.' 
                      : 'Mikrofon antippen für Sprachsteuerung.'}
                </p>
                {voiceError && (
                  <p className="text-amber-200/90 text-sm">{voiceError}</p>
                )}
              </div>

              <WaveformVisualizer isActive={isVoiceActive} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto h-full flex flex-col space-y-4">
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center flex-col text-slate-500 space-y-3">
                    <MessageSquare size={40} className="opacity-30" />
                    <p className="text-sm">Schreibe eine Nachricht – sie wird an den ElevenLabs-Agent gesendet</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-slate-600 text-slate-100' 
                        : msg.role === 'system'
                          ? 'bg-slate-800/60 text-slate-500 italic text-xs'
                          : 'bg-slate-800/70 text-slate-200 border border-slate-700/60'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="relative mt-auto pt-2">
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    sendUserActivity?.();
                  }}
                  placeholder="Nachricht an ElevenLabs-Agent senden…"
                  className="w-full bg-slate-800/60 border border-slate-600/60 rounded-lg py-3 pl-5 pr-14 focus:outline-none focus:ring-1 focus:ring-slate-500/50 focus:border-slate-500/50 transition-colors text-sm"
                />
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-600 hover:bg-slate-500 rounded-md text-slate-100 transition-colors disabled:opacity-50"
                >
                  <Waves size={18} className={isProcessing ? 'animate-pulse' : ''} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <footer className="h-9 border-t border-slate-700/60 bg-slate-800/30 px-5 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-4">
            <span>v1.0.4</span>
            <span className="text-slate-600">·</span>
            <span>ElevenLabs: <span className={conversationStatus === 'connected' ? 'text-emerald-500/90' : 'text-slate-600'}>{conversationStatus === 'connected' ? 'Verbunden' : 'Getrennt'}</span></span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
