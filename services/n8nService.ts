import { ApiKeys } from "../types";

export const n8nService = {
  triggerWebhook: async (message: string, keys: ApiKeys) => {
    if (!keys.n8nWebhookUrl?.trim()) {
      throw new Error(
        "n8n Webhook-URL fehlt. Bitte in der Admin-Konfiguration eintragen.",
      );
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (keys.n8nApiKey?.trim()) {
      headers["X-N8N-API-KEY"] = keys.n8nApiKey.trim();
    }
    try {
      const response = await fetch(keys.n8nWebhookUrl.trim(), {
        method: "POST",
        headers,
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          source: "voice-orchestrator-app",
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `n8n ${response.status}: ${response.statusText}${body ? ` – ${body.slice(0, 100)}` : ""}`,
        );
      }

      const text = await response.text();
      if (!text?.trim()) return "Workflow erfolgreich ausgelöst.";
      try {
        const data = JSON.parse(text);
        return (
          data.output ?? data.response ?? "Workflow erfolgreich ausgelöst."
        );
      } catch {
        return text;
      }
    } catch (error) {
      console.error("Failed to trigger n8n workflow:", error);
      throw error;
    }
  },

  /**
   * Prüft, ob die n8n Webhook-URL erreichbar ist.
   */
  testConnection: async (
    webhookUrl: string,
    apiKey?: string,
  ): Promise<{ ok: boolean; message: string }> => {
    if (!webhookUrl?.trim()) {
      return { ok: false, message: "Webhook-URL fehlt." };
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey?.trim()) headers["X-N8N-API-KEY"] = apiKey.trim();
    try {
      const res = await fetch(webhookUrl.trim(), {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: "[Test]",
          timestamp: new Date().toISOString(),
          source: "connection-test",
        }),
      });
      if (res.ok) return { ok: true, message: "n8n: Webhook erreichbar." };
      const text = await res.text();
      return {
        ok: false,
        message: `n8n ${res.status}: ${text?.slice(0, 80) || res.statusText}`,
      };
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Verbindung fehlgeschlagen (Netzwerk/CORS?).";
      return { ok: false, message: `n8n: ${msg}` };
    }
  },
};
