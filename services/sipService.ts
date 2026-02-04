import { SIPConfig, SIPContact, SIPCall } from '../types';

class SIPService {
  private sipInstance: any = null;
  private sipConfig: SIPConfig | null = null;
  private currentCall: SIPCall | null = null;
  private contacts: SIPContact[] = [];
  private isConnected = false;

  /**
   * Initialisiert den SIP-Stack (JsSIP in einer echten Implementierung)
   */
  async initializeSIP(): Promise<void> {
    // In einer echten Implementierung würde JsSIP hier initialisiert
    // Für den Prototyp simulieren wir dies
    console.log('SIP Stack initialisiert');
  }

  /**
   * Registriert den Benutzer beim SIP-Registrar
   */
  async register(config: SIPConfig): Promise<{ success: boolean; message: string }> {
    try {
      if (!config.registrar || !config.port || !config.username || !config.password) {
        throw new Error('Unvollständige SIP-Konfiguration');
      }

      // Validiere die Konfiguration
      if (!this.isValidSIPRegistrar(config.registrar)) {
        throw new Error('Ungültige Registrar-Adresse');
      }

      if (config.protocol === 'TLS' && !config.certificatePath) {
        throw new Error('Zertifikat erforderlich für TLS-Verbindung');
      }

      this.sipConfig = config;

      // In einer echten Implementierung würde hier die Registrierung stattfinden
      // Für den Prototyp simulieren wir einen erfolgreichen Registrierungsprozess
      await this.simulateRegistration();

      this.isConnected = true;
      
      return {
        success: true,
        message: `Erfolgreich registriert bei ${config.registrar}:${config.port} (${config.protocol})`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registrierung fehlgeschlagen';
      return {
        success: false,
        message
      };
    }
  }

  /**
   * Trennt die SIP-Verbindung
   */
  async unregister(): Promise<void> {
    if (this.currentCall) {
      await this.endCall();
    }
    this.isConnected = false;
    this.sipConfig = null;
  }

  /**
   * Startet einen ausgehenden Anruf
   */
  async makeCall(phoneNumber: string): Promise<{ success: boolean; callId?: string; message: string }> {
    try {
      if (!this.isConnected || !this.sipConfig) {
        throw new Error('SIP nicht registriert');
      }

      if (!this.isValidPhoneNumber(phoneNumber)) {
        throw new Error('Ungültige Telefonnummer');
      }

      const callId = this.generateCallId();
      const call: SIPCall = {
        callId,
        remoteNumber: phoneNumber,
        direction: 'outgoing',
        status: 'connecting',
        duration: 0,
        timestamp: Date.now()
      };

      this.currentCall = call;

      // Simuliere einen erfolgreichen Anruf
      setTimeout(() => {
        if (this.currentCall?.callId === callId && this.currentCall.status === 'connecting') {
          this.currentCall.status = 'connected';
        }
      }, 2000);

      return {
        success: true,
        callId,
        message: `Anruf zu ${phoneNumber} wird aufgebaut…`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Anruf konnte nicht aufgebaut werden';
      return {
        success: false,
        message
      };
    }
  }

  /**
   * Beendet den aktuellen Anruf
   */
  async endCall(): Promise<void> {
    if (this.currentCall) {
      this.currentCall.status = 'ended';
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
      timestamp: Date.now()
    };
    this.contacts.push(contact);
    this.persistContacts();
    return contact;
  }

  /**
   * Löscht einen Kontakt
   */
  deleteContact(contactId: string): void {
    this.contacts = this.contacts.filter(c => c.id !== contactId);
    this.persistContacts();
  }

  /**
   * Importiert Kontakte aus einer Datei (CSV/JSON)
   */
  async importContacts(file: File): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const content = await file.text();
      const imported = this.parseContactFile(content, file.name);
      
      this.contacts = [...this.contacts, ...imported];
      this.persistContacts();

      return {
        success: true,
        count: imported.length,
        message: `${imported.length} Kontakt(e) erfolgreich importiert`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import fehlgeschlagen';
      return {
        success: false,
        count: 0,
        message
      };
    }
  }

  /**
   * Exportiert Kontakte als CSV
   */
  exportContactsAsCSV(): string {
    let csv = 'Name,Nummer\n';
    this.contacts.forEach(contact => {
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
   * Überprüft, ob SIP verbunden ist
   */
  isRegistered(): boolean {
    return this.isConnected;
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
  async handleCertificate(file: File | null): Promise<{ success: boolean; message: string }> {
    try {
      if (!file) {
        throw new Error('Keine Datei ausgewählt');
      }

      if (!file.name.endsWith('.pem') && !file.name.endsWith('.crt') && !file.name.endsWith('.cer')) {
        throw new Error('Ungültiges Zertifikatformat. Erwartet: .pem, .crt oder .cer');
      }

      const content = await file.text();
      if (!content.includes('BEGIN CERTIFICATE') && !content.includes('BEGIN RSA PRIVATE KEY')) {
        throw new Error('Ungültiges Zertifikatformat');
      }

      if (this.sipConfig) {
        this.sipConfig.certificatePath = file.name;
      }

      return {
        success: true,
        message: `Zertifikat ${file.name} erfolgreich installiert`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zertifikat-Verarbeitung fehlgeschlagen';
      return {
        success: false,
        message
      };
    }
  }

  // ============ Private Hilfsmethoden ============

  private isValidPhoneNumber(number: string): boolean {
    // Einfache Validierung - akzeptiert Zahlen und +, -, (), Leerzeichen
    return /^[\d\s\-()#+*]+$/.test(number) && number.length >= 3;
  }

  private isValidSIPRegistrar(registrar: string): boolean {
    // Validiere IP-Adresse oder Hostname
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    return ipv4Regex.test(registrar) || hostnameRegex.test(registrar);
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateContactId(): string {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async simulateRegistration(): Promise<void> {
    // Simuliere Verzögerung bei der Registrierung
    return new Promise(resolve => setTimeout(resolve, 1500));
  }

  private persistContacts(): void {
    try {
      localStorage.setItem('sip_contacts', JSON.stringify(this.contacts));
    } catch (error) {
      console.error('Fehler beim Speichern der Kontakte:', error);
    }
  }

  private loadContacts(): void {
    try {
      const saved = localStorage.getItem('sip_contacts');
      if (saved) {
        this.contacts = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kontakte:', error);
      this.contacts = [];
    }
  }

  private parseContactFile(content: string, filename: string): SIPContact[] {
    try {
      if (filename.endsWith('.json')) {
        const data = JSON.parse(content);
        return Array.isArray(data) ? data.map(item => ({
          id: this.generateContactId(),
          name: item.name || item.displayName || 'Unbekannt',
          number: item.number || item.phone || '',
          timestamp: Date.now()
        })) : [];
      } else {
        // CSV-Format
        const lines = content.split('\n').filter(line => line.trim());
        const contacts: SIPContact[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const [name, number] = lines[i].split(',').map(s => s.replace(/"/g, '').trim());
          if (name && number && this.isValidPhoneNumber(number)) {
            contacts.push({
              id: this.generateContactId(),
              name,
              number,
              timestamp: Date.now()
            });
          }
        }
        return contacts;
      }
    } catch (error) {
      throw new Error('Konnte Kontakt-Datei nicht parsen');
    }
  }

  constructor() {
    this.loadContacts();
  }
}

// Singleton-Instanz
export const sipService = new SIPService();
