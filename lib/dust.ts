const DUST_WORKSPACE_ID = process.env.DUST_WORKSPACE_ID ?? "Eugenia-Hackathon";
const DUST_API_KEY = process.env.DUST_API_KEY ?? "";
const BASE = `https://dust.tt/api/v1/w/${DUST_WORKSPACE_ID}`;

async function createConversation(): Promise<string> {
  const res = await fetch(`${BASE}/assistant/conversations`, {
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
  if (!res.ok) throw new Error(`Dust conversation creation failed: ${res.status}`);
  const { conversation } = await res.json();
  return conversation.sId;
}

async function sendMessage(conversationId: string, agentId: string, content: string): Promise<void> {
  const res = await fetch(`${BASE}/assistant/conversations/${conversationId}/messages`, {
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
  if (!res.ok) throw new Error(`Dust message send failed: ${res.status}`);
}

async function pollForResponse(conversationId: string): Promise<string> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch(`${BASE}/assistant/conversations/${conversationId}`, {
      headers: { Authorization: `Bearer ${DUST_API_KEY}` },
    });
    if (!res.ok) continue;

    const data = await res.json();
    const messages: any[] = data.conversation?.content?.flat() ?? [];
    const agentMessage = messages.find(
      (m: any) => m.type === "agent_message" && m.status === "succeeded"
    );

    if (agentMessage) return agentMessage.content;
  }
  throw new Error("Timeout — agent did not respond in time");
}

export async function callDustAgent(agentId: string, message: string): Promise<string> {
  const convId = await createConversation();
  await sendMessage(convId, agentId, message);
  return pollForResponse(convId);
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
  const brandProfile = JSON.parse(brandProfileRaw);

  const scoresRaw = await callDustAgent(
    agentMarketplaceScorer,
    JSON.stringify(brandProfile)
  );
  const scores = JSON.parse(scoresRaw);

  const emailPackageRaw = await callDustAgent(
    agentEmailCrafter,
    JSON.stringify({ brandProfile, scores })
  );
  const emailPackage = JSON.parse(emailPackageRaw);

  return { brandProfile, scores, emailPackage };
}

export async function runC2Pipeline(scrapedContent: string): Promise<{
  sellerProfile: any;
  emailPackage: any;
}> {
  const agentSellerMatcher = process.env.AGENT_SELLER_MATCHER!;
  const agentEmailCrafter = process.env.AGENT_EMAIL_CRAFTER_C2!;

  const sellerProfileRaw = await callDustAgent(agentSellerMatcher, scrapedContent);
  const sellerProfile = JSON.parse(sellerProfileRaw);

  const emailPackageRaw = await callDustAgent(
    agentEmailCrafter,
    JSON.stringify(sellerProfile)
  );
  const emailPackage = JSON.parse(emailPackageRaw);

  return { sellerProfile, emailPackage };
}
