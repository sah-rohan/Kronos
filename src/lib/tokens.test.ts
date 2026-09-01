/**
 * Proves the single-source-of-truth properties that audit finding #3 was about.
 *
 * The original defect was not that a colour was wrong — it was that legend and
 * chart were coloured by *independent* code, so they drifted until none of the
 * three legend colours appeared on the chart. These tests assert the structural
 * property that makes that impossible, rather than asserting specific hex
 * values (which would just be a second place to drift).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DIFFICULTY,
  DIFFICULTY_BY_KEY,
  difficultyBg,
  difficultyFill,
  difficultyFor,
} from "./difficulty";
import { dayStateClass, dayStateSwatchClass, DAY_LEGEND_ENTRIES } from "./dayStyles";
import type { DayState } from "./calendar";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

/** Pulls the fill token out of a class string, e.g. "bg-streak-today". */
function fillToken(classes: string): string | undefined {
  return classes.split(/\s+/).find((c) => c.startsWith("bg-"));
}

describe("difficulty is defined exactly once", () => {
  it("orders semantically, not by value", () => {
    expect(DIFFICULTY.map((d) => d.key)).toEqual(["easy", "medium", "hard"]);
    expect(DIFFICULTY.map((d) => d.order)).toEqual([0, 1, 2]);
  });

  it("every difficulty has a token backed by a real CSS custom property", () => {
    for (const d of DIFFICULTY) {
      expect(css).toContain(`--color-${d.token}:`);
      expect(css).toContain(`--color-${d.token}-foreground:`);
    }
  });

  it("declares a dark-mode value for every difficulty token", () => {
    const dark = css.slice(css.indexOf(".dark {"));
    for (const d of DIFFICULTY) {
      expect(dark).toContain(`--color-${d.token}:`);
    }
  });

  it("mark and legend helpers resolve to the SAME token, not merely the same colour", () => {
    for (const d of DIFFICULTY) {
      // difficultyBg is what a bar uses; difficultyFill is what a badge/swatch
      // uses. Both must name the identical token or the two can drift.
      expect(difficultyFill(d).startsWith(difficultyBg(d))).toBe(true);
      expect(fillToken(difficultyFill(d))).toBe(`bg-${d.token}`);
    }
  });

  it("resolves API labels case-insensitively and refuses to guess", () => {
    expect(difficultyFor("Easy")).toBe(DIFFICULTY_BY_KEY.easy);
    expect(difficultyFor("HARD")).toBe(DIFFICULTY_BY_KEY.hard);
    expect(difficultyFor("Impossible")).toBeUndefined();
  });

  it("uses three distinct tokens", () => {
    expect(new Set(DIFFICULTY.map((d) => d.token)).size).toBe(3);
  });
});

describe("calendar day states are defined exactly once", () => {
  const states: DayState[] = ["today", "streak", "solved", "empty"];

  it("gives every state a legend entry", () => {
    expect(DAY_LEGEND_ENTRIES.map((e) => e.state).sort()).toEqual(
      [...states].sort(),
    );
  });

  it("every legend entry has a non-empty text label", () => {
    for (const e of DAY_LEGEND_ENTRIES) {
      expect(e.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("legend swatch and grid cell use the identical fill token", () => {
    for (const s of states) {
      expect(fillToken(dayStateSwatchClass(s))).toBe(fillToken(dayStateClass(s)));
    }
  });

  it("uses a distinct token per state, so no two states look alike", () => {
    const tokens = states.map((s) => fillToken(dayStateClass(s)));
    expect(new Set(tokens).size).toBe(states.length);
  });

  it("backs every state token with a real CSS custom property, light and dark", () => {
    const dark = css.slice(css.indexOf(".dark {"));
    for (const s of states) {
      const token = fillToken(dayStateClass(s))!.replace(/^bg-/, "");
      expect(css).toContain(`--color-${token}:`);
      expect(dark).toContain(`--color-${token}:`);
    }
  });

  it("distinguishes today by more than colour", () => {
    // Shape as well as fill: a ring, so it survives greyscale and CVD.
    expect(dayStateClass("today")).toContain("ring-2");
    expect(dayStateClass("streak")).not.toContain("ring-2");
  });

  it("does not reuse the difficulty tokens for day states", () => {
    const dayTokens = states.map((s) => fillToken(dayStateClass(s)));
    const diffTokens = DIFFICULTY.map((d) => `bg-${d.token}`);
    for (const t of dayTokens) expect(diffTokens).not.toContain(t);
  });
});
