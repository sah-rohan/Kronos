import { afterEach, describe, expect, it } from "vitest";
import { fmtShortDate, daysUntil } from "./date";

afterEach(() => {
  process.env.TZ = "UTC";
});

describe("fmtShortDate", () => {
  it("formats a full ISO timestamp instead of returning empty", () => {
    process.env.TZ = "America/New_York";
    // 01:30Z on the 27th is 21:30 on the 26th in New York.
    expect(fmtShortDate("2026-08-27T01:30:00Z")).toBe("Aug 26");
  });

  it("formats a date-only key as that exact day, in every zone", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(fmtShortDate("2026-08-26")).toBe("Aug 26");
    process.env.TZ = "Asia/Tokyo";
    expect(fmtShortDate("2026-08-26")).toBe("Aug 26");
  });

  it("returns empty for missing or unparseable input", () => {
    expect(fmtShortDate()).toBe("");
    expect(fmtShortDate("")).toBe("");
    expect(fmtShortDate("not a date")).toBe("");
  });
});

describe("daysUntil", () => {
  it("returns null for missing or invalid input", () => {
    expect(daysUntil()).toBeNull();
    expect(daysUntil("nope")).toBeNull();
  });
});
