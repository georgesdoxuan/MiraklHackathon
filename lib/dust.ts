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

function shouldFallbackOnAgentFailure(error: unknown): boolean {
  if (isTransientNetworkError(error)) return true;
  if (error instanceof Error && error.message.includes("Timeout — agent did not respond in time")) {
    return true;
  }
  if (error instanceof DustApiError && error.status >= 500) {
    return true;
  }
  return false;
}

async function pollForResponse(base: string, conversationId: string, options: PollOptions = {}): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 60;
  const intervalMs = options.intervalMs ?? 2000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));

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
        continue;
      }
      throw error;
    }
  }
  throw new Error("Timeout — agent did not respond in time");
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

export async function callDustAgent(agentId: string, message: string, options: PollOptions = {}): Promise<string> {
  const bases = getCandidateBases();
  let lastError: unknown = null;

  for (const base of bases) {
    try {
      const convId = await createConversation(base);
      await sendMessage(base, convId, agentId, message);
      return pollForResponse(base, convId, options);
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

export async function runC1Pipeline(scrapedContent: string): Promise<{
  brandProfile: any;
  scores: any;
  emailPackage: any;
}> {
  const agentBrandAnalyst = process.env.AGENT_BRAND_ANALYST!;
  const agentMarketplaceScorer = process.env.AGENT_MARKETPLACE_SCORER!;
  const agentEmailCrafter = process.env.AGENT_EMAIL_CRAFTER_C1!;

  let brandProfile: any = {};
  try {
    const brandProfileRaw = await callDustAgent(agentBrandAnalyst, scrapedContent, { maxAttempts: 35, intervalMs: 1500 });
    brandProfile = parseAgentJson(brandProfileRaw, "brandProfile");
  } catch (error) {
    if (!shouldFallbackOnAgentFailure(error)) {
      throw error;
    }
  }

  let scores: any = {};
  try {
    const scoresRaw = await callDustAgent(
      agentMarketplaceScorer,
      JSON.stringify(brandProfile),
      { maxAttempts: 30, intervalMs: 1500 }
    );
    scores = parseAgentJson(scoresRaw, "scores");
  } catch (error) {
    if (!shouldFallbackOnAgentFailure(error)) {
      throw error;
    }
  }

  let emailPackage: any = {};
  try {
    const emailPackageRaw = await callDustAgent(
      agentEmailCrafter,
      JSON.stringify({ brandProfile, scores }),
      { maxAttempts: 25, intervalMs: 1500 }
    );
    emailPackage = parseEmailPackage(emailPackageRaw, "emailPackage");
  } catch (error) {
    if (!shouldFallbackOnAgentFailure(error)) {
      throw error;
    }
    emailPackage = {
      body: "",
    };
  }

  return { brandProfile, scores, emailPackage };
}

export async function runC2Pipeline(scrapedContent: string): Promise<{
  sellerProfile: any;
  emailPackage: any;
}> {
  const agentSellerMatcher = process.env.AGENT_SELLER_MATCHER!;
  const agentEmailCrafter = process.env.AGENT_EMAIL_CRAFTER_C2!;

  let sellerProfile: any = {};
  try {
    const sellerProfileRaw = await callDustAgent(agentSellerMatcher, scrapedContent, { maxAttempts: 35, intervalMs: 1500 });
    sellerProfile = parseAgentJson(sellerProfileRaw, "sellerProfile");
  } catch (error) {
    if (!shouldFallbackOnAgentFailure(error)) {
      throw error;
    }
  }

  let emailPackage: any = {};
  try {
    const emailPackageRaw = await callDustAgent(
      agentEmailCrafter,
      JSON.stringify(sellerProfile),
      { maxAttempts: 25, intervalMs: 1500 }
    );
    emailPackage = parseEmailPackage(emailPackageRaw, "emailPackage");
  } catch (error) {
    if (!shouldFallbackOnAgentFailure(error)) {
      throw error;
    }
    emailPackage = {
      body: "",
    };
  }

  return { sellerProfile, emailPackage };
}
