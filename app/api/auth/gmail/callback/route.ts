import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${base}/?gmail=error`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${base}/api/auth/gmail/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${base}/?gmail=error`);
  }

  const response = NextResponse.redirect(`${base}/?gmail=connected`);

  response.cookies.set("gmail_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: tokenData.expires_in ?? 3600,
    path: "/",
  });

  if (tokenData.refresh_token) {
    response.cookies.set("gmail_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  return response;
}
