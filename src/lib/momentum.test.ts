import { afterEach, describe, expect, it, vi } from "vitest";
import {
  comparisonNote,
  recentDayKeys,
  solvedInWindow,
  streakLabel,
  weeklyDelta,
} from "./momentum";
import type { RecentItem } from "../types";

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = "UTC";
});

function row(n: number, who: string[], at: string): RecentItem {
  return {
    n,
    slug: `p${n}`,
    name: `Problem ${n}`,
    diff: "Easy",
    who: who.map((name) => ({ name, initials: "XX", color: "" })),
    at,
  };
}

describe("recentDayKeys", () => {
  it("walks back from today in local time, including today", () => {
    process.env.TZ = "America/New_York";
    expect(recentDayKeys("2026-09-01", 3)).toEqual([
      "2026-09-01",
      "2026-08-31",
      "2026-08-30",
    ]);
  });
});

describe("solvedInWindow", () => {
  const feed = [
    row(1, ["Jordan Dev"], "2026-09-01T15:00:00Z"),
    row(2, ["Jordan Dev", "Mira Chen"], "2026-08-30T15:00:00Z"),
    row(3, ["Mira Chen"], "2026-08-29T15:00:00Z"),
    row(4, ["Jordan Dev"], "2026-08-01T15:00:00Z"), // outside the window
  ];

  it("counts only that person's solves inside the window", () => {
    process.env.TZ = "UTC";
    expect(solvedInWindow(feed, "Jordan Dev", "2026-09-01")).toBe(2);
    expect(solvedInWindow(feed, "Mira Chen", "2026-09-01")).toBe(2);
  });

  it("counts a shared solve for everyone credited on it", () => {
    process.env.TZ = "UTC";
    // Row 2 lists both names; both should get credit.
    expect(solvedInWindow([feed[1]], "Jordan Dev", "2026-09-01")).toBe(1);
    expect(solvedInWindow([feed[1]], "Mira Chen", "2026-09-01")).toBe(1);
  });

  it("returns zero for someone not in the feed", () => {
    expect(solvedInWindow(feed, "Nobody", "2026-09-01")).toBe(0);
  });

  it("ignores rows with a missing or unparseable timestamp", () => {
    expect(solvedInWindow([row(9, ["Jordan Dev"], "")], "Jordan Dev", "2026-09-01")).toBe(0);
    expect(solvedInWindow([row(9, ["Jordan Dev"], "nope")], "Jordan Dev", "2026-09-01")).toBe(0);
  });

  it("uses local day boundaries, not UTC", () => {
    process.env.TZ = "America/New_York";
    // 2026-09-01T02:00Z is still Aug 31 locally, so a 1-day window ending
    // Sep 1 must NOT include it.
    const late = [row(1, ["Jordan Dev"], "2026-09-01T02:00:00Z")];
    expect(solvedInWindow(late, "Jordan Dev", "2026-09-01", 1)).toBe(0);
    expect(solvedInWindow(late, "Jordan Dev", "2026-09-01", 2)).toBe(1);
  });
});

describe("weeklyDelta never expresses a deficit", () => {
  it("is non-negative and prefixed with + when there is activity", () => {
    const m = weeklyDelta(3);
    expect(m.count).toBe(3);
    expect(m.label).toBe("+3 this week");
    expect(m.active).toBe(true);
  });

  it("reads neutrally at zero rather than as a negative number", () => {
    const m = weeklyDelta(0);
    expect(m.count).toBe(0);
    expect(m.active).toBe(false);
    expect(m.label).not.toMatch(/-/);
    expect(m.label).toBe("No solves yet this week");
  });

  it("clamps rather than rendering a minus sign, whatever it is handed", () => {
    // Guards the invariant even if a caller ever computes a difference.
    for (const n of [0, 1, 25]) {
      expect(weeklyDelta(n).label.startsWith("-")).toBe(false);
    }
  });
});

describe("streakLabel", () => {
  it("invites rather than scolds at zero", () => {
    expect(streakLabel(0)).toBe("Start a streak today");
    expect(streakLabel(-3)).toBe("Start a streak today");
  });

  it("pluralises correctly", () => {
    expect(streakLabel(1)).toBe("1 day in a row");
    expect(streakLabel(6)).toBe("6 days in a row");
  });
});

describe("comparisonNote never shames", () => {
  const cases: [number, number][] = [
    [0, 0],
    [5, 5],
    [9, 2],
    [2, 9], // the case that could shame
  ];

  it("never states a gap size or uses deficit language", () => {
    for (const [mine, theirs] of cases) {
      const note = comparisonNote(mine, theirs, "Mira");
      expect(note).not.toMatch(/behind by|less than|fewer|losing|deficit/i);
      // Never leaks a raw difference into the copy.
      expect(note).not.toMatch(/\d/);
    }
  });

  it("frames the trailing case as an opportunity", () => {
    expect(comparisonNote(2, 9, "Mira")).toBe("Mira is on a run. Good week to catch up.");
  });
});
