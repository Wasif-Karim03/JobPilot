import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { encrypt } from "@/server/services/encryption";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code || !userId) {
    return NextResponse.redirect(`${appUrl}/gmail-connected?error=${error ?? "missing_code"}`);
  }

  // Verify the user session matches the state param
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user || session.user.id !== userId) {
    return NextResponse.redirect(`${appUrl}/gmail-connected?error=unauthorized`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/gmail/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Gmail token exchange failed:", err);
      return NextResponse.redirect(`${appUrl}/gmail-connected?error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get the Gmail account email
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = await profileRes.json();
    const gmailEmail = profile.email as string;

    // Encrypt tokens before storing
    const { encrypted: encryptedAccess, iv: accessIv } = encrypt(access_token);
    const { encrypted: encryptedRefresh, iv: refreshIv } = encrypt(refresh_token ?? "");

    const tokenExpiry = new Date(Date.now() + (expires_in ?? 3600) * 1000);

    await prisma.gmailConnection.upsert({
      where: { userId },
      create: {
        userId,
        gmailEmail,
        accessTokenEncrypted: encryptedAccess,
        accessTokenIv: accessIv,
        refreshTokenEncrypted: encryptedRefresh,
        refreshTokenIv: refreshIv,
        tokenExpiry,
        isActive: true,
      },
      update: {
        gmailEmail,
        accessTokenEncrypted: encryptedAccess,
        accessTokenIv: accessIv,
        refreshTokenEncrypted: encryptedRefresh,
        refreshTokenIv: refreshIv,
        tokenExpiry,
        isActive: true,
      },
    });

    // Redirect back — detect if user is still onboarding or in settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true },
    });

    return NextResponse.redirect(`${appUrl}/gmail-connected`);
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(`${appUrl}/gmail-connected?error=server_error`);
  }
}
