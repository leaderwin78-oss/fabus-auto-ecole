// Minimal Anthropic Messages API client — no SDK dependency needed for a
// single-turn chat call. Returns an honest "not configured" result instead
// of ever faking a response when ANTHROPIC_API_KEY is unset (section 22:
// "Ne pas prétendre avoir un accès ... si aucune API n'est configurée").
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantResult {
  ok: boolean;
  reply?: string;
  error?: string;
}

export function isAssistantConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callAssistant(systemPrompt: string, messages: ChatMessage[]): Promise<AssistantResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "L'assistant IA n'est pas encore configuré sur cette plateforme (clé API manquante). Contactez votre administrateur.",
    };
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      // Le corps de la réponse amont peut contenir des détails de compte ou de
      // clé : il reste dans les logs serveur, jamais dans le navigateur.
      const body = await response.text();
      console.error("[anthropic]", response.status, body.slice(0, 500));
      return {
        ok: false,
        error:
          response.status === 429
            ? "L'assistant est très sollicité en ce moment. Réessayez dans quelques instants."
            : "L'assistant IA est momentanément indisponible.",
      };
    }

    const data = await response.json();
    const text = (data.content ?? [])
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n");

    return { ok: true, reply: text || "(réponse vide)" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur réseau." };
  }
}
