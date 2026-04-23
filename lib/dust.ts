const DUST_WORKSPACE_ID = process.env.DUST_WORKSPACE_ID ?? "Eugenia-Hackathon";
const DUST_API_KEY = process.env.DUST_API_KEY ?? "";

type DustErrorPayload = { error?: { type?: string; message?: string } };

class DustApiError extends Error {
  status: number;
  code?: string;
  constructor(action: string, status: number, code?: string, message?: string) {
    super(`Dust ${action} failed: ${status}${code ? ` (${code})` : ""}${message ? ` — ${message}` : ""}`);
    this.status = status;
    this.code = code;
  }
}

function getCandidateBases(): string[] {
  const explicit = process.env.DUST_API_BASE_URL?.trim();
  if (explicit) {
    return [`${explicit.replace(/\/+$/, "")}/api/v1/w/${DUST_WORKSPACE_ID}`];
  }

  // Dust docs expose both hosts; some workspaces/keys are region-specific.
  return [
    `https://dust.tt/api/v1/w/${DUST_WORKSPACE_ID}`,
    `https://eu.dust.tt/api/v1/w/${DUST_WORKSPACE_ID}`,
  ];
}

async function buildDustError(res: Response, action: string): Promise<DustApiError> {
  let payload: DustErrorPayload | undefined;
  try {
    payload = (await res.json()) as DustErrorPayload;
  } catch {
    payload = undefined;
  }
  return new DustApiError(action, res.status, payload?.error?.type, payload?.error?.message);
}

async function createConversation(base: string): Promise<string> {
  const res = await fetch(`${base}/assistant/conversations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DUST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      visibility: "unlisted",
      title: `BDR Pipeline — ${new Date().toISOString()}`,
    }),
  });
  if (!res.ok) throw await buildDustError(res, "conversation creation");
  const { conversation } = await res.json();
  return conversation.sId;
}

async function sendMessage(base: string, conversationId: string, agentId: string, content: string): Promise<void> {
  const res = await fetch(`${base}/assistant/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DUST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      mentions: [{ configurationId: agentId }],
      context: {
        timezone: "Europe/Paris",
        username: "bdr-pipeline",
        fullName: "BDR Pipeline",
        email: "pipeline@miraklconnect.com",
        profilePictureUrl: null,
      },
    }),
  });
  if (!res.ok) throw await buildDustError(res, "message send");
}

type PollOptions = {
  maxAttempts?: number;
  intervalMs?: number;
  fastAttempts?: number;
  fastIntervalMs?: number;
};

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const causeCode = (error as Error & { cause?: { code?: string } }).cause?.code;
  return (
    message.includes("fetch failed") ||
    message.includes("timed out") ||
    message.includes("etimedout") ||
    causeCode === "ETIMEDOUT" ||
    causeCode === "ECONNRESET" ||
    causeCode === "EAI_AGAIN"
  );
}

async function pollForResponse(base: string, conversationId: string, options: PollOptions = {}): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 300;
  const intervalMs = options.intervalMs ?? 2000;
  const fastAttempts = options.fastAttempts ?? 10;
  const fastIntervalMs = options.fastIntervalMs ?? 500;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${base}/assistant/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${DUST_API_KEY}` },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const messages: any[] = data.conversation?.content?.flat() ?? [];
      const agentMessage = messages.find(
        (m: any) => m.type === "agent_message" && m.status === "succeeded"
      );

      if (agentMessage) return agentMessage.content;
    } catch (error) {
      if (isTransientNetworkError(error)) {
        // keep polling; transient network issues should not cancel a valid generation
      } else {
        throw error;
      }
    }

    const waitMs = i < fastAttempts ? fastIntervalMs : intervalMs;
    await new Promise(r => setTimeout(r, waitMs));
  }
  throw new Error("Timeout — agent did not respond in time");
}

const DEFAULT_POLL_OPTIONS: PollOptions = {
  maxAttempts: 300,
  fastAttempts: 10,
  fastIntervalMs: 500,
  intervalMs: 2000,
};

export async function callDustAgent(agentId: string, message: string, options: PollOptions = {}): Promise<string> {
  const pollOptions = {
    ...DEFAULT_POLL_OPTIONS,
    ...options,
  };
  const bases = getCandidateBases();
  let lastError: unknown = null;

  for (const base of bases) {
    try {
      const convId = await createConversation(base);
      await sendMessage(base, convId, agentId, message);
      return pollForResponse(base, convId, pollOptions);
    } catch (err) {
      lastError = err;
      // Retry on likely region mismatch only.
      if (err instanceof DustApiError && err.status === 401 && err.code === "invalid_api_key_error") {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Dust call failed");
}

function parseAgentJson(raw: string, stage: string): any {
  const trimmed = raw.trim();

  // Handle common LLM formatting: ```json ... ```
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const unfenced = fencedMatch ? fencedMatch[1].trim() : trimmed;

  // Be resilient to extra text before/after JSON payload.
  const candidates = [unfenced];
  const objectStart = unfenced.indexOf("{");
  const objectEnd = unfenced.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(unfenced.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = unfenced.indexOf("[");
  const arrayEnd = unfenced.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    candidates.push(unfenced.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Dust returned non-JSON output at stage "${stage}": ${trimmed.slice(0, 200)}`);
}

function parseEmailPackage(raw: string, stage: string): any {
  try {
    return parseAgentJson(raw, stage);
  } catch {
    const cleaned = raw
      .replace(/:cite\[[^\]]+\]/g, "")
      .replace(/```+/g, "")
      .replace(/\r/g, "")
      .trim();

    const findMatch = (pattern: RegExp): string | undefined => {
      const match = cleaned.match(pattern);
      return match?.[1]?.trim();
    };

    const subjectA = findMatch(/\*\*Sujet A\s*:\*\*\s*(.+)/i);
    const subjectB = findMatch(/\*\*Sujet B\s*:\*\*\s*(.+)/i);

    // Prefer the "EMAIL PRINCIPAL" body when available.
    const mainEmailBlock = findMatch(
      /##\s*EMAIL PRINCIPAL[\s\S]*?\*\*Corps\s*:\*\*\s*([\s\S]*?)(?:\n---\n|\n##\s|$)/i
    );

    const fallbackBody = cleaned
      .replace(/^([\s\S]*?)(#\s*Package Prospection)/i, "$2")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      ...(subjectA ? { subjectA } : {}),
      ...(subjectB ? { subjectB } : {}),
      body: (mainEmailBlock || fallbackBody).trim(),
    };
  }
}

export async function runC1Pipeline(scrapedContent: string): Promise<{
  brandProfile: any;
  scores: any;
  emailPackage: any;
}> {
  const agentBrandAnalyst = process.env.AGENT_BRAND_ANALYST!;
  const agentMarketplaceScorer = process.env.AGENT_MARKETPLACE_SCORER!;
  const agentEmailCrafter = process.env.AGENT_EMAIL_CRAFTER_C1!;

  const brandProfileRaw = await callDustAgent(agentBrandAnalyst, scrapedContent);
  const brandProfile = parseAgentJson(brandProfileRaw, "brandProfile");

  const scoresRaw = await callDustAgent(
    agentMarketplaceScorer,
    JSON.stringify(brandProfile)
  );
  const scores = parseAgentJson(scoresRaw, "scores");

  const emailPackageRaw = await callDustAgent(
    agentEmailCrafter,
    JSON.stringify({ brandProfile, scores })
  );
  const emailPackage = parseEmailPackage(emailPackageRaw, "emailPackage");

  return { brandProfile, scores, emailPackage };
}

export async function runC2Pipeline(scrapedContent: string): Promise<{
  sellerProfile: any;
  emailPackage: any;
}> {
  const agentSellerMatcher = process.env.AGENT_SELLER_MATCHER!;
  const agentEmailCrafter = process.env.AGENT_EMAIL_CRAFTER_C2!;

  const sellerProfileRaw = await callDustAgent(agentSellerMatcher, scrapedContent);
  const sellerProfile = parseAgentJson(sellerProfileRaw, "sellerProfile");

  const emailPackageRaw = await callDustAgent(
    agentEmailCrafter,
    JSON.stringify(sellerProfile)
  );
  const emailPackage = parseEmailPackage(emailPackageRaw, "emailPackage");

  return { sellerProfile, emailPackage };
}
