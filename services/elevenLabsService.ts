/**
 * ElevenLabs Service - Hilft bei der Verbindung zu privaten Agents.
 * Für private Agents (mit API Key) wird eine Signed URL von der ElevenLabs API geholt.
 * Für öffentliche Agents wird nur die Agent-ID benötigt.
 */
export const elevenLabsService = {
  /**
   * Holt eine signierte URL für private ElevenLabs Agents.
   * Der API-Key wird für diesen Aufruf verwendet und sollte nicht im Client exponiert werden.
   * Für produktive Umgebungen empfiehlt sich ein Backend-Endpoint.
   */
  getSignedUrl: async (agentId: string, apiKey: string): Promise<string> => {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs Signed URL fehlgeschlagen: ${response.status} ${errorText}`);
    }

    const text = await response.text();
    let body: { signed_url?: string } = {};
    if (text) { try { body = JSON.parse(text); } catch { /* ignore */ } }
    if (!body.signed_url) {
      throw new Error('Keine signed_url in der ElevenLabs-Antwort erhalten.');
    }
    return body.signed_url;
  },
};
