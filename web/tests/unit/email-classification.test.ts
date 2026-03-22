import { describe, it, expect } from "vitest";

// Mirror the parseJsonObject helper from worker/services/claude.ts
function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Mirror the parseJsonArray helper
function parseJsonArray(text: string): unknown[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fall through
      }
    }
  }
  return [];
}

// Email subject classifiers (mirrors logic used in worker)
function detectStatusFromSubject(subject: string): string | null {
  const lower = subject.toLowerCase();
  if (lower.includes("offer") && !lower.includes("referr")) return "OFFER";
  if (lower.includes("interview") || lower.includes("schedule") || lower.includes("invite")) return "INTERVIEW";
  if (lower.includes("phone screen") || lower.includes("recruiter call")) return "PHONE_SCREEN";
  if (lower.includes("reject") || lower.includes("not moving forward") || lower.includes("other candidates")) return "REJECTED";
  if (lower.includes("application received") || lower.includes("we received your") || lower.includes("thank you for applying")) return "APPLIED";
  return null;
}

describe("parseJsonObject", () => {
  it("parses clean JSON object", () => {
    const result = parseJsonObject('{"isJobRelated": true, "company": "Acme"}');
    expect(result).toEqual({ isJobRelated: true, company: "Acme" });
  });

  it("extracts JSON object from surrounding text", () => {
    const result = parseJsonObject('Here is the result: {"status": "OFFER"} That is it.');
    expect(result).toEqual({ status: "OFFER" });
  });

  it("returns null for invalid JSON", () => {
    const result = parseJsonObject("not json at all");
    expect(result).toBeNull();
  });

  it("handles nested objects", () => {
    const result = parseJsonObject('{"matchScore": 85, "details": {"skills": ["React", "TypeScript"]}}');
    expect(result?.matchScore).toBe(85);
  });
});

describe("parseJsonArray", () => {
  it("parses clean JSON array", () => {
    const result = parseJsonArray('[{"title": "SWE", "company": "Acme"}]');
    expect(result).toHaveLength(1);
    expect((result[0] as Record<string, string>).title).toBe("SWE");
  });

  it("extracts array from surrounding text", () => {
    const result = parseJsonArray('The jobs found: [{"title": "Backend Eng"}] End.');
    expect(result).toHaveLength(1);
  });

  it("returns empty array for invalid input", () => {
    expect(parseJsonArray("no array here")).toEqual([]);
    expect(parseJsonArray("")).toEqual([]);
  });

  it("returns empty array if top-level is object not array", () => {
    const result = parseJsonArray('{"title": "SWE"}');
    expect(result).toEqual([]);
  });
});

describe("detectStatusFromSubject", () => {
  it("detects offer", () => {
    expect(detectStatusFromSubject("Congratulations! You've received an offer")).toBe("OFFER");
    expect(detectStatusFromSubject("Job Offer from Acme Corp")).toBe("OFFER");
  });

  it("detects interview invite", () => {
    expect(detectStatusFromSubject("Interview Invitation for Software Engineer")).toBe("INTERVIEW");
    expect(detectStatusFromSubject("Please schedule your technical interview")).toBe("INTERVIEW");
  });

  it("detects phone screen", () => {
    expect(detectStatusFromSubject("Phone screen with recruiter call")).toBe("PHONE_SCREEN");
  });

  it("detects rejection", () => {
    expect(detectStatusFromSubject("We have decided not to move forward with other candidates")).toBe("REJECTED");
    expect(detectStatusFromSubject("Your application - we've moved on")).toBe(null); // not a clear signal
    expect(detectStatusFromSubject("Unfortunately we are not moving forward")).toBe("REJECTED");
  });

  it("detects application received", () => {
    expect(detectStatusFromSubject("Thank you for applying to Acme")).toBe("APPLIED");
    expect(detectStatusFromSubject("Application received - Software Engineer")).toBe("APPLIED");
  });

  it("returns null for unrelated subjects", () => {
    expect(detectStatusFromSubject("Your weekly newsletter")).toBeNull();
    expect(detectStatusFromSubject("Meeting tomorrow at 3pm")).toBeNull();
  });
});
