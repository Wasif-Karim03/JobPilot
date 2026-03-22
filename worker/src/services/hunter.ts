import { logger } from "../lib/logger";
import { env } from "../lib/env";

interface HunterEmailFinderResult {
  email: string | null;
  confidence: number;
  firstName?: string;
  lastName?: string;
}

interface HunterDomainResult {
  domain: string;
  pattern?: string;
}

const BASE_URL = "https://api.hunter.io/v2";

async function hunterGet(path: string, params: Record<string, string>): Promise<unknown> {
  if (!env.HUNTER_API_KEY) return null;

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", env.HUNTER_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logger.warn("Hunter.io request failed", { error: (err as Error).message, path });
    return null;
  }
}

export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string
): Promise<HunterEmailFinderResult> {
  const data = await hunterGet("/email-finder", {
    first_name: firstName,
    last_name: lastName,
    domain,
  }) as { data?: { email?: string; score?: number } } | null;

  if (!data?.data) return { email: null, confidence: 0 };

  return {
    email: data.data.email ?? null,
    confidence: data.data.score ?? 0,
  };
}

export async function getDomainPattern(domain: string): Promise<HunterDomainResult> {
  const data = await hunterGet("/domain-search", { domain, limit: "1" }) as {
    data?: { domain?: string; pattern?: string };
  } | null;

  return {
    domain,
    pattern: data?.data?.pattern,
  };
}

export function companyNameToDomain(company: string): string {
  // Best-effort: lowercase, remove common suffixes, add .com
  return (
    company
      .toLowerCase()
      .replace(/\s+(inc|llc|corp|ltd|co|company|technologies|tech|labs|group)\.?$/i, "")
      .replace(/[^a-z0-9]/g, "") + ".com"
  );
}
