
import { ApiKeys } from '../types';

export const n8nService = {
  triggerWebhook: async (message: string, keys: ApiKeys) => {
    try {
      const response = await fetch(keys.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': keys.n8nApiKey,
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          source: 'voice-orchestrator-app',
        }),
      });

      if (!response.ok) {
        throw new Error(`n8n Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.output || data.response || "Workflow erfolgreich ausgelöst.";
    } catch (error) {
      console.error("Failed to trigger n8n workflow:", error);
      throw error;
    }
  }
};
