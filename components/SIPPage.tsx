import React, { useState, useEffect } from "react";
import { Phone, PhoneOff, Copy, Download, Upload, Trash2 } from "lucide-react";
import { sipService } from "../services/sipService";
import { SIPCall, SIPContact } from "../types";

interface SIPPageProps {
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

const SIPPage: React.FC<SIPPageProps> = ({ onOpenSettings, onLogout }) => {
  const [dialNumber, setDialNumber] = useState("");
  const [currentCall, setCurrentCall] = useState<SIPCall | null>(null);
  const [contacts, setContacts] = useState<SIPContact[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Lade Kontakte beim Start
    const loadContacts = () => {
      setContacts(sipService.getContacts());
      setIsRegistered(sipService.isRegistered());
    };

    loadContacts();

    // Aktualisiere Anrufstatus regelmäßig
    const callCheckInterval = setInterval(() => {
      const call = sipService.getCurrentCall();
      setCurrentCall(call);

      if (call?.status === "connected" && isCallActive) {
        setCallDuration((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(callCheckInterval);
  }, [isCallActive]);

  const handleDialNumber = (digit: string) => {
    setDialNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = async () => {
    if (!isRegistered) {
      setStatusMessage(
        "SIP-Nebenstelle nicht registriert. Konfiguriere die Einstellungen.",
      );
      return;
    }

    if (!dialNumber.trim()) {
      setStatusMessage("Bitte geben Sie eine Telefonnummer ein.");
      return;
    }

    const result = await sipService.makeCall(dialNumber);
    if (result.success) {
      setIsCallActive(true);
      setCallDuration(0);
      setStatusMessage(result.message);
    } else {
      setStatusMessage(`Fehler: ${result.message}`);
    }
  };

  const handleEndCall = async () => {
    await sipService.endCall();
    setIsCallActive(false);
    setCurrentCall(null);
    setDialNumber("");
    setCallDuration(0);
    setStatusMessage("Anruf beendet");
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactNumber.trim()) {
      setStatusMessage("Bitte Name und Nummer eingeben.");
      return;
    }

    sipService.saveContact(newContactName, newContactNumber);
    setContacts(sipService.getContacts());
    setNewContactName("");
    setNewContactNumber("");
    setShowAddContact(false);
    setStatusMessage("Kontakt hinzugefügt");
  };

  const handleDeleteContact = (contactId: string) => {
    sipService.deleteContact(contactId);
    setContacts(sipService.getContacts());
    setStatusMessage("Kontakt gelöscht");
  };

  const handleCallContact = (number: string) => {
    setDialNumber(number);
  };

  const handleImportContacts = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await sipService.importContacts(file);
      setStatusMessage(result.message);
      if (result.success) {
        setContacts(sipService.getContacts());
      }
    }
  };

  const handleExportContacts = () => {
    const csv = sipService.exportContactsAsCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sip-contacts-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="h-16 border-b border-slate-700/60 flex items-center justify-between px-6 bg-slate-800/30">
        <div className="flex items-center space-x-3">
          <div
            className={`w-2 h-2 rounded-full ${isRegistered ? "bg-emerald-500/80" : "bg-red-500/60"}`}
          />
          <span className="text-sm font-medium text-slate-400">
            {isRegistered
              ? "SIP-Nebenstelle registriert"
              : "SIP-Nebenstelle nicht registriert"}
          </span>
        </div>
        <button
          onClick={onOpenSettings}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200 text-sm transition-colors"
        >
          SIP-Einstellungen
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-2 p-2">
        {/* Dialer Section */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-1">
          {/* Call Display - Restored larger number display */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded p-0.5">
            <div className="text-center">
              <p className="text-slate-500 text-[8px] mb-0">
                {isCallActive ? "Anruf aktiv" : "Nr."}
              </p>
              <div className="text-base font-mono font-bold text-slate-100 tracking-wider mb-0 min-h-5 line-clamp-1">
                {isCallActive && currentCall
                  ? currentCall.remoteNumber
                  : dialNumber || "–"}
              </div>
              {isCallActive && (
                <div className="text-xs font-mono text-emerald-400">
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>
          </div>

          {/* Manual Input Field */}
          <input
            type="text"
            value={dialNumber}
            onChange={(e) =>
              setDialNumber(e.target.value.replace(/[^\d\-()#+* ]/g, ""))
            }
            placeholder="..."
            disabled={isCallActive}
            className="w-3/4 mx-auto bg-slate-800/60 border border-slate-600/60 rounded-full px-4 py-2 text-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Dial Pad */}
          <div className="w-full max-w-md mx-auto">
            <div className="phone-card w-full bg-slate-900/70 rounded-2xl border border-slate-700/60 p-4 shadow-lg flex flex-col items-center">
              {/* Display */}
              <div className="w-full mb-2 text-center">
                <p className="text-slate-400 text-sm mb-1">
                  {isCallActive ? "Anruf aktiv" : "Nr."}
                </p>
                <div className="text-3xl md:text-4xl lg:text-5xl font-mono font-bold text-slate-100 tracking-wider mb-1 min-h-[2.5rem] line-clamp-1">
                  {isCallActive && currentCall
                    ? currentCall.remoteNumber
                    : dialNumber || "–"}
                </div>
                {isCallActive && (
                  <div className="text-sm text-emerald-400">
                    {formatDuration(callDuration)}
                  </div>
                )}
              </div>

              {/* Large input / number field */}
              <input
                type="text"
                value={dialNumber}
                onChange={(e) =>
                  setDialNumber(e.target.value.replace(/[^\d\-()#+* ]/g, ""))
                }
                placeholder="Nummer eingeben"
                disabled={isCallActive}
                className="w-full text-center bg-slate-800/60 border border-slate-600/60 rounded-full px-4 py-3 text-2xl md:text-3xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* Keypad */}
              <div className="w-full mt-4">
                <div className="grid grid-cols-3 gap-3 justify-items-center">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "*",
                    "0",
                    "#",
                  ].map((digit) => (
                    <button
                      key={digit}
                      onClick={() => !isCallActive && handleDialNumber(digit)}
                      disabled={isCallActive}
                      className="w-14 h-14 md:w-16 md:h-16 bg-slate-700 hover:bg-slate-600 rounded-full text-lg md:text-xl font-semibold text-slate-100 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {digit}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleBackspace}
                    disabled={!dialNumber || isCallActive}
                    className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200 text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setDialNumber("")}
                    disabled={!dialNumber || isCallActive}
                    className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200 text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    C
                  </button>
                </div>

                <div className="flex gap-3 mt-3">
                  {isCallActive ? (
                    <button
                      onClick={handleEndCall}
                      className="flex-1 h-12 bg-red-600 hover:bg-red-700 rounded-full text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <PhoneOff size={18} />
                      Auflegen
                    </button>
                  ) : (
                    <button
                      onClick={handleCall}
                      disabled={!dialNumber.trim() || !isRegistered}
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Phone size={18} />
                      Anrufen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 p-3">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <p>Keine Kontakte vorhanden</p>
                <p className="text-xs mt-2">Importieren oder hinzufügen</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-slate-700/50 hover:bg-slate-700 rounded p-3 flex items-center justify-between group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 text-sm truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {contact.number}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCallContact(contact.number)}
                      disabled={isCallActive}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white transition-colors disabled:opacity-50"
                      title="Anrufen"
                    >
                      <Phone size={14} />
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(contact.number);
                        setStatusMessage("Nummer kopiert");
                      }}
                      className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded text-slate-200 transition-colors"
                      title="Kopieren"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Contact Actions */}
          <div className="border-t border-slate-700/60 p-3 flex gap-2">
            <label className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200 cursor-pointer transition-colors flex items-center justify-center gap-2">
              <Upload size={14} />
              Import
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleImportContacts}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExportContacts}
              disabled={contacts.length === 0}
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SIPPage;
