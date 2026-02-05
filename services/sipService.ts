import { SIPConfig, SIPContact, SIPCall } from "../types";
import JsSIP from "jssip";

class SIPService {
  private ua: any = null;
  private sipConfig: SIPConfig | null = null;
  private currentCall: SIPCall | null = null;
  private currentSession: any = null;
  private contacts: SIPContact[] = [];
  private registrationState = false;
  private listeners: Record<string, Function[]> = {};
  private remoteAudio: HTMLAudioElement | null = null;

  /**
   * Initialisiert und verbindet den SIP-Stack mit JsSIP
   */
  async initializeSIP(): Promise<void> {
    console.log("SIP Service bereit");
  }

  /**
   * Registriert den Benutzer beim SIP-Registrar mit echtem WebSocket/WSS
   */
  async register(
    config: SIPConfig,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (
        !config.registrar ||
        !config.port ||
        !config.username ||
        !config.password
      ) {
        throw new Error("Unvollständige SIP-Konfiguration");
      }

      if (!this.isValidSIPRegistrar(config.registrar)) {
        throw new Error("Ungültige Registrar-Adresse");
      }

      this.sipConfig = config;

      // Initialisiere JsSIP mit WebSocket (Provider-WS-URL bevorzugt)
      const protocol = config.protocol === "TLS" ? "wss" : "ws";
      const wsUri = config.websocketUrl?.trim()
        ? config.websocketUrl.trim()
        : `${protocol}://${config.registrar}:${config.port}`;
      if (!wsUri.startsWith("ws://") && !wsUri.startsWith("wss://")) {
        throw new Error("WebSocket-URL muss mit ws:// oder wss:// beginnen");
      }
      const sipUri = `sip:${config.username}@${config.registrar}`;

      const socket = new JsSIP.WebSocketInterface(wsUri);
      const uaConfig = {
        sockets: [socket],
        uri: sipUri,
        password: config.password,
        display_name: config.displayName || config.username,
        register: false,
        session_timers: false,
        trace_sip: true,
      };

      this.ua = new JsSIP.UA(uaConfig);

      // Event-Listener registrieren
      this.ua.on("registered", () => {
        this.registrationState = true;
        this.emit("registered");
      });

      this.ua.on("unregistered", () => {
        this.registrationState = false;
        this.emit("unregistered");
      });

      this.ua.on("registrationFailed", (e: any) => {
        this.registrationState = false;
        const cause = e?.cause || "Unbekannter Fehler";
        console.error("SIP Registrierung fehlgeschlagen:", cause);
        this.emit("registrationFailed", { cause });
      });

      this.ua.on("newRTCSession", (e: any) => {
        this.currentSession = e?.session || null;
        if (this.currentSession) {
          this.attachSessionMedia(this.currentSession);
          this.bindSessionEvents(this.currentSession);
        }
        this.emit("newRTCSession", e);
      });

      // Starte UA
      this.ua.start();

      // Warte auf Verbindung mit Timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Verbindungs-Timeout"));
        }, 5000);

        const onConnect = () => {
          clearTimeout(timeout);
          this.ua.off("connected", onConnect);
          resolve();
        };

        this.ua.on("connected", onConnect);
      });

      // Starte Registrierung
      this.ua.register();

      // Warte auf erfolgreiche Registrierung oder Fehler
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Registrierungs-Timeout"));
        }, 10000);

        const onReg = () => {
          clearTimeout(timeout);
          this.off("registered", onReg);
          this.off("registrationFailed", onFail);
          resolve();
        };

        const onFail = (data: any) => {
          clearTimeout(timeout);
          this.off("registered", onReg);
          this.off("registrationFailed", onFail);
          reject(
            new Error(
              `Registrierung fehlgeschlagen: ${data?.cause || "unbekannt"}`,
            ),
          );
        };

        this.on("registered", onReg);
        this.on("registrationFailed", onFail);
      });

      return {
        success: true,
        message: `Erfolgreich registriert bei ${config.registrar}:${config.port} (${config.protocol})`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registrierung fehlgeschlagen";
      console.error("SIP Register Error:", message);
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Trennt die SIP-Verbindung
   */
  async unregister(): Promise<void> {
    try {
      if (this.currentCall) {
        await this.endCall();
      }
      if (this.currentSession) {
        try {
          this.currentSession.terminate();
        } catch {
          /* ignore */
        }
        this.currentSession = null;
      }
      if (this.ua) {
        this.ua.unregister();
        this.ua.stop();
        this.ua = null;
      }
      this.registrationState = false;
      this.sipConfig = null;
    } catch (error) {
      console.error("Fehler beim Unregister:", error);
    }
  }

  /**
   * Startet einen ausgehenden Anruf
   */
  async makeCall(
    phoneNumber: string,
  ): Promise<{ success: boolean; callId?: string; message: string }> {
    try {
      if (!this.registrationState || !this.sipConfig) {
        throw new Error("SIP nicht registriert");
      }

      if (!this.isValidPhoneNumber(phoneNumber)) {
        throw new Error("Ungültige Telefonnummer");
      }

      if (!this.ua) {
        throw new Error("SIP-Client nicht bereit");
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Browser unterstützt kein Mikrofon");
      }

      const callId = this.generateCallId();
      const call: SIPCall = {
        callId,
        remoteNumber: phoneNumber,
        direction: "outgoing",
        status: "connecting",
        duration: 0,
        timestamp: Date.now(),
      };

      this.currentCall = call;

      // Stelle sicher, dass der Browser das Mikrofon freigibt (User-Interaction vorhanden)
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.getTracks().forEach((t) => t.stop());
      } catch (err) {
        throw new Error("Mikrofonzugriff verweigert oder nicht verfügbar");
      }

      const target = `sip:${phoneNumber}@${this.sipConfig.registrar}`;
      const session = this.ua.call(target, {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        },
      });

      this.currentSession = session;
      this.attachSessionMedia(session);
      this.bindSessionEvents(session);

      return {
        success: true,
        callId,
        message: `Anruf zu ${phoneNumber} wird aufgebaut…`,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Anruf konnte nicht aufgebaut werden";
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Beendet den aktuellen Anruf
   */
  async endCall(): Promise<void> {
    if (this.currentSession) {
      try {
        this.currentSession.terminate();
      } catch {
        /* ignore */
      }
      this.currentSession = null;
    }
    if (this.currentCall) {
      this.currentCall.status = "ended";
      this.currentCall = null;
    }
  }

  /**
   * Speichert einen Kontakt
   */
  saveContact(name: string, phoneNumber: string): SIPContact {
    const contact: SIPContact = {
      id: this.generateContactId(),
      name,
      number: phoneNumber,
      timestamp: Date.now(),
    };
    this.contacts.push(contact);
    this.persistContacts();
    return contact;
  }

  /**
   * Löscht einen Kontakt
   */
  deleteContact(contactId: string): void {
    this.contacts = this.contacts.filter((c) => c.id !== contactId);
    this.persistContacts();
  }

  /**
   * Importiert Kontakte aus einer Datei (CSV/JSON)
   */
  async importContacts(
    file: File,
  ): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const content = await file.text();
      const imported = this.parseContactFile(content, file.name);

      this.contacts = [...this.contacts, ...imported];
      this.persistContacts();

      return {
        success: true,
        count: imported.length,
        message: `${imported.length} Kontakt(e) erfolgreich importiert`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Import fehlgeschlagen";
      return {
        success: false,
        count: 0,
        message,
      };
    }
  }

  /**
   * Exportiert Kontakte als CSV
   */
  exportContactsAsCSV(): string {
    let csv = "Name,Nummer\n";
    this.contacts.forEach((contact) => {
      csv += `"${contact.name}","${contact.number}"\n`;
    });
    return csv;
  }

  /**
   * Gibt alle gespeicherten Kontakte zurück
   */
  getContacts(): SIPContact[] {
    return [...this.contacts];
  }

  /**
   * Gibt den aktuellen Anrufstatus zurück
   */
  getCurrentCall(): SIPCall | null {
    return this.currentCall ? { ...this.currentCall } : null;
  }

  /**
   * Gibt den Registrationsstatus zurück
   */
  isRegistered(): boolean {
    return this.registrationState;
  }

  /**
   * Gibt die aktuelle SIP-Konfiguration zurück
   */
  getConfig(): SIPConfig | null {
    return this.sipConfig ? { ...this.sipConfig } : null;
  }

  /**
   * Lädt oder speichert ein Zertifikat
   */
  async handleCertificate(
    file: File | null,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!file) {
        throw new Error("Keine Datei ausgewählt");
      }

      if (
        !file.name.endsWith(".pem") &&
        !file.name.endsWith(".crt") &&
        !file.name.endsWith(".cer")
      ) {
        throw new Error(
          "Ungültiges Zertifikatformat. Erwartet: .pem, .crt oder .cer",
        );
      }

      const content = await file.text();
      if (
        !content.includes("BEGIN CERTIFICATE") &&
        !content.includes("BEGIN RSA PRIVATE KEY")
      ) {
        throw new Error("Ungültiges Zertifikatformat");
      }

      if (this.sipConfig) {
        this.sipConfig.certificatePath = file.name;
      }

      return {
        success: true,
        message: `Zertifikat ${file.name} erfolgreich installiert`,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Zertifikat-Verarbeitung fehlgeschlagen";
      return {
        success: false,
        message,
      };
    }
  }

  // ============ Private Hilfsmethoden ============

  private isValidPhoneNumber(number: string): boolean {
    return /^[\d\s\-()#+*]+$/.test(number) && number.length >= 3;
  }

  private isValidSIPRegistrar(registrar: string): boolean {
    // IPv4 address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 address
    const ipv6Regex = /^(\[?([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\]?)$/;
    // Hostname/domain (allows localhost, domain names with dots, hyphens, etc.)
    const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    
    return ipv4Regex.test(registrar) || ipv6Regex.test(registrar) || hostnameRegex.test(registrar);
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateContactId(): string {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private on(event: string, cb: Function) {
    (this.listeners[event] ||= []).push(cb);
  }

  private off(event: string, cb: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((fn) => fn !== cb);
  }

  private emit(event: string, data?: any) {
    (this.listeners[event] || []).forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error(`Error in event listener for '${event}':`, e);
      }
    });
  }

  private persistContacts(): void {
    try {
      localStorage.setItem("sip_contacts", JSON.stringify(this.contacts));
    } catch (error) {
      console.error("Fehler beim Speichern der Kontakte:", error);
    }
  }

  private loadContacts(): void {
    try {
      const saved = localStorage.getItem("sip_contacts");
      if (saved) {
        this.contacts = JSON.parse(saved);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Kontakte:", error);
      this.contacts = [];
    }
  }

  private parseContactFile(content: string, filename: string): SIPContact[] {
    try {
      if (filename.endsWith(".json")) {
        const data = JSON.parse(content);
        return Array.isArray(data)
          ? data.map((item) => ({
              id: this.generateContactId(),
              name: item.name || item.displayName || "Unbekannt",
              number: item.number || item.phone || "",
              timestamp: Date.now(),
            }))
          : [];
      } else {
        // CSV-Format
        const lines = content.split("\n").filter((line) => line.trim());
        const contacts: SIPContact[] = [];

        for (let i = 1; i < lines.length; i++) {
          const [name, number] = lines[i]
            .split(",")
            .map((s) => s.replace(/"/g, "").trim());
          if (name && number && this.isValidPhoneNumber(number)) {
            contacts.push({
              id: this.generateContactId(),
              name,
              number,
              timestamp: Date.now(),
            });
          }
        }
        return contacts;
      }
    } catch (error) {
      throw new Error("Konnte Kontakt-Datei nicht parsen");
    }
  }

  setRemoteAudioElement(element: HTMLAudioElement | null): void {
    this.remoteAudio = element;
  }

  private attachSessionMedia(session: any): void {
    session?.on?.("peerconnection", (e: any) => {
      const pc = e?.peerconnection;
      if (!pc) return;

      const handleStream = (stream: MediaStream) => {
        if (this.remoteAudio) {
          this.remoteAudio.srcObject = stream;
          this.remoteAudio.play().catch(() => {
            /* autoplay can be blocked */
          });
        }
      };

      pc.addEventListener("track", (ev: any) => {
        const stream = ev?.streams?.[0];
        if (stream) handleStream(stream);
      });

      pc.onaddstream = (ev: any) => {
        if (ev?.stream) handleStream(ev.stream);
      };
    });
  }

  private bindSessionEvents(session: any): void {
    session?.on?.("progress", () => {
      if (this.currentCall) this.currentCall.status = "connecting";
    });
    session?.on?.("accepted", () => {
      if (this.currentCall) this.currentCall.status = "connected";
    });
    session?.on?.("confirmed", () => {
      if (this.currentCall) this.currentCall.status = "connected";
    });
    session?.on?.("failed", () => {
      if (this.currentCall) this.currentCall.status = "ended";
      this.currentSession = null;
    });
    session?.on?.("ended", () => {
      if (this.currentCall) this.currentCall.status = "ended";
      this.currentSession = null;
    });
  }

  constructor() {
    this.loadContacts();
  }
}

// Singleton-Instanz
export const sipService = new SIPService();
