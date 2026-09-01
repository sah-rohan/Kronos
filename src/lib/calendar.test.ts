/**
 * Regression tests for the calendar date logic — audit finding #4.
 *
 * The bug these pin down: the streak card computed its grid and its header in
 * UTC while the calendar overlay computed its grid in local time, so two
 * independent notions of "today" existed. For anyone west of Greenwich in the
 * evening, the header read one day while the user's own clock read another.
 *
 * Every case sets `process.env.TZ` explicitly rather than trusting the machine's
 * zone, so the suite gives the same answer on a developer laptop and in a UTC CI
 * container. Node re-reads TZ when the variable changes, so this works at
 * runtime without `cross-env`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dateKey,
  dayState,
  monthGridCells,
  monthOf,
  clampMonth,
  startOfLocalDay,
  streakKeys,
  todayKey,
} from "./calendar";

/** Pin both the wall clock and the zone, the way a user's browser would be. */
function pin(tz: string, instant: string) {
  process.env.TZ = tz;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
}

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = "UTC";
});

describe("todayKey", () => {
  it("uses the LOCAL day, not the UTC day, west of Greenwich", () => {
    // 2026-08-27T00:00Z is still 2026-08-26 20:00 in New York.
    // The old UTC-based code produced "2026-08-27" and the header rendered
    // "Thu, August 27" while the user's clock said Wednesday the 26th.
    pin("America/New_York", "2026-08-27T00:00:00Z");
    expect(todayKey()).toBe("2026-08-26");
  });

  it("uses the LOCAL day east of Greenwich too", () => {
    // Same instant, Tokyo: already the 27th locally.
    pin("Asia/Tokyo", "2026-08-26T16:00:00Z");
    expect(todayKey()).toBe("2026-08-27");
  });

  it("agrees with UTC when the zone is UTC", () => {
    pin("UTC", "2026-08-27T00:00:00Z");
    expect(todayKey()).toBe("2026-08-27");
  });
});

describe("dateKey", () => {
  it("never goes through toISOString, which would shift the day", () => {
    process.env.TZ = "America/Los_Angeles";
    const d = new Date("2026-03-02T04:00:00Z"); // = Mar 1, 20:00 PST
    expect(dateKey(d)).toBe("2026-03-01");
    // Demonstrates the trap the implementation must avoid.
    expect(d.toISOString().slice(0, 10)).toBe("2026-03-02");
  });

  it("zero-pads month and day", () => {
    process.env.TZ = "UTC";
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("monthGridCells", () => {
  it("marks exactly one cell as today, and it is the correct cell", () => {
    pin("America/New_York", "2026-08-27T00:00:00Z"); // local: Wed Aug 26
    const cells = monthGridCells(2026, 7, todayKey()); // month is 0-based: August
    const todays = cells.filter((c) => c.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0].day).toBe(26);
    expect(todays[0].key).toBe("2026-08-26");
  });

  it("marks no cell as today when viewing a different month", () => {
    pin("America/New_York", "2026-08-27T00:00:00Z");
    const cells = monthGridCells(2026, 6, todayKey()); // July
    expect(cells.filter((c) => c.isToday)).toHaveLength(0);
  });

  it("pads the first row to the correct weekday and keeps day 1 in place", () => {
    process.env.TZ = "UTC";
    // 1 Aug 2026 is a Saturday -> six leading blanks.
    const cells = monthGridCells(2026, 7, "2026-08-01");
    expect(cells[0].day).toBe(1);
    expect(cells[0].weekdayIndex).toBe(6);
    expect(cells).toHaveLength(31);
  });

  it("handles a leap day", () => {
    process.env.TZ = "UTC";
    const cells = monthGridCells(2028, 1, "2028-02-29"); // February 2028
    expect(cells).toHaveLength(29);
    expect(cells.at(-1)?.key).toBe("2028-02-29");
    expect(cells.at(-1)?.isToday).toBe(true);
  });

  it("handles a non-leap February", () => {
    process.env.TZ = "UTC";
    expect(monthGridCells(2027, 1, "2027-01-01")).toHaveLength(28);
  });

  it("gets the first and last cell of the grid right across a month boundary", () => {
    pin("America/New_York", "2026-09-01T02:00:00Z"); // local: Aug 31, 22:00
    const key = todayKey();
    expect(key).toBe("2026-08-31");
    const cells = monthGridCells(2026, 7, key);
    // Last cell of August is today; nothing in September is.
    expect(cells.at(-1)?.isToday).toBe(true);
    expect(monthGridCells(2026, 8, key).filter((c) => c.isToday)).toHaveLength(0);
  });

  it("survives a DST transition without shifting a day", () => {
    process.env.TZ = "America/New_York";
    // US DST ends 1 Nov 2026; the 1st must still be day 1 of the grid.
    const cells = monthGridCells(2026, 10, "2026-11-01");
    expect(cells[0].key).toBe("2026-11-01");
    expect(cells).toHaveLength(30);
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
  });
});

describe("startOfLocalDay", () => {
  it("returns local midnight, not UTC midnight", () => {
    process.env.TZ = "America/New_York";
    const d = startOfLocalDay(new Date("2026-08-26T18:30:00Z"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(dateKey(d)).toBe("2026-08-26");
  });
});

describe("streakKeys", () => {
  it("collects the unbroken run ending today", () => {
    process.env.TZ = "America/New_York";
    const byDate = { "2026-08-24": 1, "2026-08-25": 2, "2026-08-26": 1 };
    const keys = streakKeys(byDate, "2026-08-26");
    expect([...keys].sort()).toEqual(["2026-08-24", "2026-08-25", "2026-08-26"]);
  });

  it("does not break the streak when today has no solves yet", () => {
    process.env.TZ = "America/New_York";
    // Nothing today, but yesterday and the day before are solved.
    const byDate = { "2026-08-25": 1, "2026-08-26": 1 };
    expect(streakKeys(byDate, "2026-08-27").size).toBe(2);
  });

  it("stops at a gap", () => {
    process.env.TZ = "UTC";
    const byDate = { "2026-08-20": 1, "2026-08-25": 1, "2026-08-26": 1 };
    const keys = streakKeys(byDate, "2026-08-26");
    expect(keys.has("2026-08-20")).toBe(false);
    expect(keys.size).toBe(2);
  });

  it("walks correctly across a month boundary", () => {
    process.env.TZ = "America/New_York";
    const byDate = { "2026-07-31": 1, "2026-08-01": 1 };
    expect(streakKeys(byDate, "2026-08-01").size).toBe(2);
  });

  it("returns nothing when there are no solves", () => {
    process.env.TZ = "UTC";
    expect(streakKeys({}, "2026-08-26").size).toBe(0);
  });
});

describe("dayState", () => {
  const streak = new Set(["2026-08-25", "2026-08-26"]);

  it("gives every day exactly one state, with today winning", () => {
    // Today is also a streak day; it must report as "today" so the legend reads
    // literally and no cell carries two meanings.
    expect(dayState("2026-08-26", "2026-08-26", 2, streak)).toBe("today");
    expect(dayState("2026-08-25", "2026-08-26", 1, streak)).toBe("streak");
    expect(dayState("2026-08-20", "2026-08-26", 3, streak)).toBe("solved");
    expect(dayState("2026-08-19", "2026-08-26", 0, streak)).toBe("empty");
  });

  it("marks today even when nothing was solved on it", () => {
    expect(dayState("2026-08-27", "2026-08-27", 0, streak)).toBe("today");
  });
});

describe("monthOf / clampMonth", () => {
  it("reads the month in local time, not UTC", () => {
    process.env.TZ = "America/New_York";
    // 2026-09-01T02:00Z is still 31 Aug locally, so this is August (month 7).
    expect(monthOf(new Date("2026-09-01T02:00:00Z"))).toEqual({ year: 2026, month: 7 });
  });

  const JUN = { year: 2026, month: 5 };
  const SEP = { year: 2026, month: 8 };

  it("returns the target when it is inside the range", () => {
    expect(clampMonth({ year: 2026, month: 7 }, JUN, SEP)).toEqual({ year: 2026, month: 7 });
  });

  it("clamps to the start when the target is before the range", () => {
    expect(clampMonth({ year: 2026, month: 2 }, JUN, SEP)).toEqual(JUN);
    expect(clampMonth({ year: 2025, month: 11 }, JUN, SEP)).toEqual(JUN);
  });

  it("clamps to the end when the target is after the range", () => {
    expect(clampMonth({ year: 2026, month: 11 }, JUN, SEP)).toEqual(SEP);
    expect(clampMonth({ year: 2027, month: 0 }, JUN, SEP)).toEqual(SEP);
  });

  it("keeps the bounds themselves", () => {
    expect(clampMonth(JUN, JUN, SEP)).toEqual(JUN);
    expect(clampMonth(SEP, JUN, SEP)).toEqual(SEP);
  });

  it("handles a range that straddles a year boundary", () => {
    const NOV = { year: 2026, month: 10 };
    const FEB = { year: 2027, month: 1 };
    expect(clampMonth({ year: 2027, month: 0 }, NOV, FEB)).toEqual({ year: 2027, month: 0 });
    expect(clampMonth({ year: 2026, month: 9 }, NOV, FEB)).toEqual(NOV);
    expect(clampMonth({ year: 2027, month: 5 }, NOV, FEB)).toEqual(FEB);
  });
});
