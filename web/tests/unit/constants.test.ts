import { describe, it, expect } from "vitest";
import {
  MATCH_SCORE,
  RATE_LIMITS,
  CLAUDE_MODELS,
  LINKEDIN_NOTE_MAX_CHARS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PREFERENCES_DEFAULTS,
} from "@/lib/constants";

describe("MATCH_SCORE thresholds", () => {
  it("LOW < MEDIUM < GOOD", () => {
    expect(MATCH_SCORE.LOW).toBeLessThan(MATCH_SCORE.MEDIUM);
    expect(MATCH_SCORE.MEDIUM).toBeLessThan(MATCH_SCORE.GOOD);
  });

  it("GOOD threshold is 80", () => {
    expect(MATCH_SCORE.GOOD).toBe(80);
  });
});

describe("RATE_LIMITS", () => {
  it("auth rate limit: 5 req / 15 min", () => {
    expect(RATE_LIMITS.AUTH.requests).toBe(5);
    expect(RATE_LIMITS.AUTH.windowMs).toBe(15 * 60 * 1000);
  });

  it("search trigger: 1 req / hour", () => {
    expect(RATE_LIMITS.SEARCH_TRIGGER.requests).toBe(1);
    expect(RATE_LIMITS.SEARCH_TRIGGER.windowMs).toBe(60 * 60 * 1000);
  });
});

describe("CLAUDE_MODELS", () => {
  it("has all three model tiers", () => {
    expect(CLAUDE_MODELS.OPUS).toBe("claude-opus-4-6");
    expect(CLAUDE_MODELS.SONNET).toBe("claude-sonnet-4-6");
    expect(CLAUDE_MODELS.HAIKU).toBe("claude-haiku-4-5-20251001");
  });
});

describe("pagination defaults", () => {
  it("default page size is 20", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it("max page size is 50", () => {
    expect(MAX_PAGE_SIZE).toBe(50);
  });

  it("default < max", () => {
    expect(DEFAULT_PAGE_SIZE).toBeLessThan(MAX_PAGE_SIZE);
  });
});

describe("LINKEDIN_NOTE_MAX_CHARS", () => {
  it("is 200", () => {
    expect(LINKEDIN_NOTE_MAX_CHARS).toBe(200);
  });
});

describe("PREFERENCES_DEFAULTS", () => {
  it("has all required defaults", () => {
    expect(PREFERENCES_DEFAULTS.REMOTE).toBeDefined();
    expect(PREFERENCES_DEFAULTS.EXPERIENCE).toBeDefined();
    expect(PREFERENCES_DEFAULTS.SEARCH_TIME).toBeDefined();
    expect(PREFERENCES_DEFAULTS.TIMEZONE).toBeDefined();
    expect(PREFERENCES_DEFAULTS.MAX_DAILY_COST).toBeGreaterThan(0);
  });
});
