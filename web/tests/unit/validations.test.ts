import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  setApiKeySchema,
  updateApiConfigSchema,
  updatePreferencesSchema,
  deleteAccountSchema,
} from "@/lib/validations";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "securepassword",
      name: "Alice",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ email: "not-email", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects password over 128 chars", () => {
    const result = registerSchema.safeParse({
      email: "a@b.com",
      password: "a".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("name is optional", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "password123" });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "pass" });
    expect(result.success).toBe(true);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("setApiKeySchema", () => {
  it("accepts valid Claude API key", () => {
    const result = setApiKeySchema.safeParse({ apiKey: "sk-ant-" + "x".repeat(40) });
    expect(result.success).toBe(true);
  });

  it("rejects key not starting with sk-ant-", () => {
    const result = setApiKeySchema.safeParse({ apiKey: "sk-openai-" + "x".repeat(40) });
    expect(result.success).toBe(false);
  });

  it("rejects key under 40 chars", () => {
    const result = setApiKeySchema.safeParse({ apiKey: "sk-ant-short" });
    expect(result.success).toBe(false);
  });

  it("rejects key over 200 chars", () => {
    const result = setApiKeySchema.safeParse({ apiKey: "sk-ant-" + "x".repeat(200) });
    expect(result.success).toBe(false);
  });
});

describe("updateApiConfigSchema", () => {
  it("accepts valid config", () => {
    const result = updateApiConfigSchema.safeParse({
      researchModel: "claude-opus-4-6",
      searchDepth: "STANDARD",
      dailySearchEnabled: true,
      maxDailyApiCost: 15,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid model name", () => {
    const result = updateApiConfigSchema.safeParse({ researchModel: "gpt-4" });
    expect(result.success).toBe(false);
  });

  it("rejects cost below 1", () => {
    const result = updateApiConfigSchema.safeParse({ maxDailyApiCost: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects cost above 100", () => {
    const result = updateApiConfigSchema.safeParse({ maxDailyApiCost: 101 });
    expect(result.success).toBe(false);
  });

  it("accepts all optional fields absent", () => {
    const result = updateApiConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("updatePreferencesSchema", () => {
  it("accepts valid preferences", () => {
    const result = updatePreferencesSchema.safeParse({
      targetTitles: ["Software Engineer", "Backend Engineer"],
      targetLocations: ["Remote", "Columbus, OH"],
      remotePreference: "remote",
      salaryMin: 80000,
      salaryMax: 120000,
      experienceLevel: "entry",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updatePreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("deleteAccountSchema", () => {
  it("accepts valid email", () => {
    const result = deleteAccountSchema.safeParse({ confirmEmail: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects non-email", () => {
    const result = deleteAccountSchema.safeParse({ confirmEmail: "notanemail" });
    expect(result.success).toBe(false);
  });
});
