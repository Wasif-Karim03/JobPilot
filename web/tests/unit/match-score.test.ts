import { describe, it, expect } from "vitest";
import { MATCH_SCORE } from "@/lib/constants";

// Test the match-score color logic that the UI uses
function getMatchColor(score: number): string {
  if (score >= MATCH_SCORE.GOOD) return "green";
  if (score >= MATCH_SCORE.MEDIUM) return "blue";
  if (score >= MATCH_SCORE.LOW) return "amber";
  return "red";
}

// Test the weighted score calculation (mirrors worker logic)
function calculateWeightedScore({
  titleMatch,
  skillsMatch,
  experienceMatch,
  otherMatch,
}: {
  titleMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  otherMatch: number;
}): number {
  return Math.round(
    titleMatch * 0.3 + skillsMatch * 0.4 + experienceMatch * 0.2 + otherMatch * 0.1
  );
}

describe("getMatchColor", () => {
  it("≥80 → green", () => {
    expect(getMatchColor(80)).toBe("green");
    expect(getMatchColor(95)).toBe("green");
    expect(getMatchColor(100)).toBe("green");
  });

  it("60–79 → blue", () => {
    expect(getMatchColor(60)).toBe("blue");
    expect(getMatchColor(75)).toBe("blue");
    expect(getMatchColor(79)).toBe("blue");
  });

  it("40–59 → amber", () => {
    expect(getMatchColor(40)).toBe("amber");
    expect(getMatchColor(55)).toBe("amber");
    expect(getMatchColor(59)).toBe("amber");
  });

  it("<40 → red", () => {
    expect(getMatchColor(0)).toBe("red");
    expect(getMatchColor(39)).toBe("red");
  });

  it("exactly at threshold boundaries", () => {
    expect(getMatchColor(MATCH_SCORE.GOOD)).toBe("green");
    expect(getMatchColor(MATCH_SCORE.MEDIUM)).toBe("blue");
    expect(getMatchColor(MATCH_SCORE.LOW)).toBe("amber");
  });
});

describe("calculateWeightedScore", () => {
  it("perfect match → 100", () => {
    expect(
      calculateWeightedScore({ titleMatch: 100, skillsMatch: 100, experienceMatch: 100, otherMatch: 100 })
    ).toBe(100);
  });

  it("zero match → 0", () => {
    expect(
      calculateWeightedScore({ titleMatch: 0, skillsMatch: 0, experienceMatch: 0, otherMatch: 0 })
    ).toBe(0);
  });

  it("skills-heavy match dominates (40% weight)", () => {
    const highSkills = calculateWeightedScore({ titleMatch: 50, skillsMatch: 100, experienceMatch: 50, otherMatch: 50 });
    const highTitle = calculateWeightedScore({ titleMatch: 100, skillsMatch: 50, experienceMatch: 50, otherMatch: 50 });
    expect(highSkills).toBeGreaterThan(highTitle);
  });

  it("typical strong candidate scores ≥80", () => {
    const score = calculateWeightedScore({
      titleMatch: 90,
      skillsMatch: 85,
      experienceMatch: 80,
      otherMatch: 75,
    });
    expect(score).toBeGreaterThanOrEqual(MATCH_SCORE.GOOD);
  });

  it("typical weak match scores <60", () => {
    const score = calculateWeightedScore({
      titleMatch: 30,
      skillsMatch: 40,
      experienceMatch: 50,
      otherMatch: 60,
    });
    expect(score).toBeLessThan(MATCH_SCORE.MEDIUM);
  });
});
