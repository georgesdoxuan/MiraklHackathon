import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function buildRaw(to: string, subject: string, body: string): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const encodedBody = Buffer.from(body).toString("base64");

  const message = [
    ...(to ? [`To: ${to}`] : []),
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodedBody,
  ].join("\r\n");

  return Buffer.from(message).toString("base64url");
}

async function refreshToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return data.access_token ?? null;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  let token = cookieStore.get("gmail_access_token")?.value;
  const refresh = cookieStore.get("gmail_refresh_token")?.value;

  if (!token && refresh) {
    token = (await refreshToken(refresh)) ?? undefined;
  }

  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { to, subject, body } = await req.json();
  const raw = buildRaw(to ?? "", subject, body);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: { raw } }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Gmail draft error:", err);
    if (res.status === 401) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "draft_failed" }, { status: 500 });
  }

  const draft = await res.json();
  return NextResponse.json({ success: true, draftId: draft.id });
}
