import { google } from "googleapis";
import { decrypt, encrypt } from "@jobpilot/shared/encryption";
import { logger } from "../lib/logger";
import { env } from "../lib/env";

export interface GmailMessage {
  id: string;
  subject: string;
  sender: string;
  bodySnippet: string;
  date: Date;
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/gmail/callback`
  );
}

interface GmailConnectionRow {
  accessTokenEncrypted: string;
  accessTokenIv: string;
  refreshTokenEncrypted: string;
  refreshTokenIv: string;
  tokenExpiry: Date;
}

export async function getAuthenticatedGmailClient(connection: GmailConnectionRow) {
  const oauth2Client = createOAuthClient();

  const accessToken = decrypt(connection.accessTokenEncrypted, connection.accessTokenIv);
  const refreshToken = decrypt(connection.refreshTokenEncrypted, connection.refreshTokenIv);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiry.getTime(),
  });

  // Refresh if expiring within 5 minutes
  if (connection.tokenExpiry.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      logger.info("Gmail token refreshed");
      return { client: oauth2Client, newCredentials: credentials };
    } catch (err) {
      logger.error("Gmail token refresh failed", { error: (err as Error).message });
    }
  }

  return { client: oauth2Client, newCredentials: null };
}

export async function scanGmailMessages(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  sinceDate?: Date
): Promise<GmailMessage[]> {
  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client as Parameters<typeof google.gmail>[0]["auth"] });

    const query = buildGmailQuery(sinceDate);

    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 100,
    });

    const messages = listRes.data.messages ?? [];
    if (messages.length === 0) return [];

    const results: GmailMessage[] = [];

    for (const msg of messages.slice(0, 100)) {
      if (!msg.id) continue;
      try {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = detail.data.payload?.headers ?? [];
        const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
        const sender = headers.find((h) => h.name === "From")?.value ?? "";
        const dateStr = headers.find((h) => h.name === "Date")?.value ?? "";
        const snippet = detail.data.snippet ?? "";

        results.push({
          id: msg.id,
          subject,
          sender,
          bodySnippet: snippet,
          date: dateStr ? new Date(dateStr) : new Date(),
        });
      } catch {
        // Skip individual message errors
      }
    }

    return results;
  } catch (err) {
    logger.error("Gmail scan failed", { error: (err as Error).message });
    return [];
  }
}

function buildGmailQuery(sinceDate?: Date): string {
  const dateFilter = sinceDate
    ? `after:${Math.floor(sinceDate.getTime() / 1000)}`
    : "newer_than:1d";

  return (
    `is:inbox ${dateFilter} ` +
    `(subject:application OR subject:interview OR subject:offer OR subject:position ` +
    `OR subject:opportunity OR subject:thank OR subject:hiring OR subject:recruiter ` +
    `OR from:greenhouse.io OR from:lever.co OR from:workday.com OR from:icims.com ` +
    `OR from:smartrecruiters.com OR from:taleo.net OR from:bamboohr.com)`
  );
}

export function encryptTokens(accessToken: string, refreshToken: string) {
  const encAccess = encrypt(accessToken);
  const encRefresh = encrypt(refreshToken);
  return {
    accessTokenEncrypted: encAccess.encrypted,
    accessTokenIv: encAccess.iv,
    refreshTokenEncrypted: encRefresh.encrypted,
    refreshTokenIv: encRefresh.iv,
  };
}
