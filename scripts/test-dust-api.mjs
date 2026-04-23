import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function testDustApi() {
  const projectRoot = process.cwd();
  loadEnvFile(path.join(projectRoot, ".env.local"));

  const workspaceId = requiredEnv("DUST_WORKSPACE_ID");
  const apiKey = requiredEnv("DUST_API_KEY");
  const agentId = requiredEnv("AGENT_BRAND_ANALYST");
  const explicitBase = process.env.DUST_API_BASE_URL?.replace(/\/+$/, "");
  const apiBases = explicitBase ? [explicitBase] : ["https://dust.tt", "https://eu.dust.tt"];
  const message = "Respond with exactly: DUST_API_OK";

  console.log("Testing Dust API...");
  console.log(`Workspace: ${workspaceId}`);
  console.log(`Agent: ${agentId}`);
  let lastErrorMessage = "Unknown error";

  for (const apiBase of apiBases) {
    const base = `${apiBase}/api/v1/w/${workspaceId}`;
    console.log(`Base URL: ${apiBase}`);
    try {
      const createRes = await fetch(`${base}/assistant/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visibility: "unlisted",
          title: `Dust API Test - ${new Date().toISOString()}`,
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.text();
        lastErrorMessage = `Conversation creation failed (${createRes.status}): ${body}`;
        console.log(`-> ${lastErrorMessage}`);
        continue;
      }

      const createJson = await createRes.json();
      const conversationId = createJson?.conversation?.sId;
      if (!conversationId) {
        lastErrorMessage = "Conversation creation succeeded but no conversation id returned.";
        console.log(`-> ${lastErrorMessage}`);
        continue;
      }

      const messageRes = await fetch(`${base}/assistant/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message,
          mentions: [{ configurationId: agentId }],
          context: {
            timezone: "Europe/Paris",
            username: "dust-api-test",
            fullName: "Dust API Test",
            email: "dust-api-test@local.dev",
            profilePictureUrl: null,
          },
        }),
      });

      if (!messageRes.ok) {
        const body = await messageRes.text();
        lastErrorMessage = `Message send failed (${messageRes.status}): ${body}`;
        console.log(`-> ${lastErrorMessage}`);
        continue;
      }

      const maxAttempts = 30;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pollRes = await fetch(`${base}/assistant/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!pollRes.ok) continue;

        const pollJson = await pollRes.json();
        const messages = pollJson?.conversation?.content?.flat?.() ?? [];
        const agentReply = messages.find(
          (entry) => entry?.type === "agent_message" && entry?.status === "succeeded"
        );

        if (agentReply?.content) {
          console.log("\nDust replied successfully:");
          console.log(agentReply.content);
          console.log("\nSUCCESS: Dust API is working.");
          return;
        }

        process.stdout.write(`Attempt ${attempt}/${maxAttempts}...\r`);
      }

      lastErrorMessage = "Timeout waiting for Dust agent response.";
      console.log(`-> ${lastErrorMessage}`);
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      console.log(`-> ${lastErrorMessage}`);
    }
  }

  throw new Error(lastErrorMessage);
}

testDustApi().catch((error) => {
  console.error("\nFAILED:", error.message);
  process.exit(1);
});
