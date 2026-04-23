import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/gmail/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.compose",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
