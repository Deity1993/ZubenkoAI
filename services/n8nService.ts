
import { ApiKeys } from '../types';

export const n8nService = {
  triggerWebhook: async (message: string, keys: ApiKeys) => {
    if (!keys.n8nWebhookUrl?.trim()) {
      throw new Error('n8n Webhook-URL fehlt. Bitte in der Admin-Konfiguration eintragen.');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (keys.n8nApiKey?.trim()) {
      headers['X-N8N-API-KEY'] = keys.n8nApiKey.trim();
    }
    try {
      const response = await fetch(keys.n8nWebhookUrl.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          source: 'voice-orchestrator-app',
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`n8n ${response.status}: ${response.statusText}${body ? ` – ${body.slice(0, 100)}` : ''}`);
      }

      const data = await response.json();
      return data.output || data.response || "Workflow erfolgreich ausgelöst.";
    } catch (error) {
      console.error("Failed to trigger n8n workflow:", error);
      throw error;
    }
  }
};
