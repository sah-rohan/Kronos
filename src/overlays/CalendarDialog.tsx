/**
 * Transient overlay — the solve calendar, opened from the streak card.
 *
 * DECISION AND KNOWN GAP (also recorded in docs/REVIEW.md): by the
 * brief's own test this is full-screen content that deserves its own route, but
 * the Phase 1 route table has no `/calendar` entry. Rather than invent a route
 * that was not specified or delete a working feature, it stays an overlay — with
 * real dialog semantics — and the gap is raised for a decision.
 *
 * Consequence to be aware of: month, selected day, and whose calendar you are
 * looking at are the only view state in the app still held in `useState` rather
 * than the URL. They move the moment this becomes a route.
 *
 * Migrated from `modals/CalendarModal.tsx`; the month state that used to live in
 * `App.tsx` is now local, which also fixes the old split ownership where `cal`
 * lived in App while `selected` and `who` lived in the modal.
 */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog } from "../components/Dialog";
import { PersonPicker, type PickerOption } from "../components/PersonPicker";
import { FriendSolutionDialog, MySolutionDialog } from "./SolutionDialog";
import { CAL_START, CAL_END } from "../data/calendar";
import { useData } from "../data/context";
import { diffStyles } from "../data/problems";
import { api } from "../lib/api";
import { initialsOf, colorFor } from "../lib/avatar";
import { fmtShortDate } from "../lib/date";
import { DayLegend } from "../components/DayLegend";
import { dayStateClass } from "../lib/dayStyles";
import {
  clampMonth,
  dayState,
  formatDayLabel,
  monthGridCells,
  monthOf,
  streakKeys,
  useToday,
} from "../lib/calendar";
import type { CalendarProblem, Friend, Month, ProblemRef } from "../types";

type CalendarSource = {
  byDate: Record<string, number>;
  byDateProblems: Record<string, CalendarProblem[]>;
};

/** Typed empty source, so the "still loading" branch keeps its index signature. */
const EMPTY_SOURCE: CalendarSource = { byDate: {}, byDateProblems: {} };

export function CalendarDialog({
  userName,
  onClose,
}: {
  userName: string;
  onClose: () => void;
}) {
  const { calendar, friends, getToken } = useData();
  // The same today the streak card uses — one source, never two.
  const today = useToday();
  /**
   * Open on the month containing today, not on the season start.
   *
   * This used to seed from CAL_START, so opening the calendar landed on the
   * first month of the season and you had to page forward to reach the present —
   * and the one cell you most want to see, today, was never on screen.
   *
   * Clamped to the season range: today can legitimately fall outside it (before
   * the season begins, or after it ends), and the nearest in-range month is a
   * better landing spot than a grid the navigation buttons cannot reach.
   *
   * Lazy initialiser, so paging around does not get reset on every render.
   */
  const [cal, setCal] = useState<Month>(() =>
    clampMonth(monthOf(today.date), CAL_START, CAL_END),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [who, setWho] = useState("you");
  const [open, setOpen] = useState<{ problem: ProblemRef; friend: Friend | null } | null>(
    null,
  );
  /**
   * Friend data is fetched on demand; "you" uses the already-loaded calendar.
   *
   * Stored with the person it belongs to so that switching person needs no
   * synchronous `setFriendData(null)` / `setLoading(true)` in the effect body —
   * both of which react-hooks/set-state-in-effect flags. "Whose data is this"
   * and "are we still waiting" are now derived below.
   */
  const [friendData, setFriendData] = useState<{
    who: string;
    byDate: Record<string, number>;
    byDateProblems: Record<string, CalendarProblem[]>;
  } | null>(null);

  useEffect(() => {
    if (who === "you") return;
    let cancelled = false;
    Promise.all([
      api.friendCalendar(getToken, who).catch(() => []),
      api.friendCalendarProblems(getToken, who).catch(() => []),
    ]).then(([days, probs]) => {
      if (cancelled) return;
      const byDate: Record<string, number> = {};
      for (const d of days ?? []) byDate[d.date] = d.count;
      const byDateProblems: Record<string, CalendarProblem[]> = {};
      for (const p of probs ?? []) {
        (byDateProblems[p.date] ??= []).push({
          slug: p.slug,
          name: p.title,
          diff: p.difficulty,
        });
      }
      setFriendData({ who, byDate, byDateProblems });
    });
    return () => {
      cancelled = true;
    };
  }, [who, getToken]);

  // Only use fetched data when it belongs to the person currently selected;
  // anything else means the fetch for this person is still in flight.
  const ready = who === "you" || friendData?.who === who;
  const loading = !ready;
  const source: CalendarSource =
    who === "you"
      ? calendar
      : friendData?.who === who
        ? friendData
        : EMPTY_SOURCE;

  const options: PickerOption[] = [
    { id: "you", name: "You", initials: initialsOf(userName), color: colorFor(userName) },
    ...friends.map((f) => ({
      id: f.id,
      name: f.name,
      initials: f.initials,
      color: f.color,
      username: f.username,
    })),
  ];

  const cells = monthGridCells(cal.year, cal.month, today.key);
  const leadPad = cells[0]?.weekdayIndex ?? 0;
  // Streak highlighting only makes sense for your own calendar.
  const streak =
    who === "you" ? streakKeys(source.byDate, today.key) : new Set<string>();
  const calLabel = new Date(cal.year, cal.month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const atStart = cal.year === CAL_START.year && cal.month === CAL_START.month;
  const atEnd = cal.year === CAL_END.year && cal.month === CAL_END.month;
  const stepMonth = (dir: number) => {
    const d = new Date(cal.year, cal.month + dir, 1);
    setCal({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(null);
  };
  const selectedProblems = selected ? (source.byDateProblems[selected] ?? []) : [];
  const whoLabel = who === "you" ? "You" : (friends.find((f) => f.id === who)?.name ?? "");

  return (
    <>
      <Dialog title={selected ? fmtShortDate(selected) : calLabel} onClose={onClose}>
        {selected ? (
          <>
            <button
              onClick={() => setSelected(null)}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-coral"
            >
              <ChevronLeft className="h-4 w-4" /> {calLabel}
            </button>
            <p className="text-sm text-muted-foreground">
              {selectedProblems.length} solved{" "}
              {whoLabel === "You" ? "by you" : `by ${whoLabel}`}
            </p>
            {selectedProblems.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                No problem details for this day.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-border">
                {selectedProblems.map((p) => {
                  const ref: ProblemRef = { name: p.name, slug: p.slug, diff: p.diff };
                  const friend =
                    who === "you" ? null : (friends.find((f) => f.id === who) ?? null);
                  return (
                    <li key={p.slug} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[p.diff]}`}
                      >
                        {p.diff}
                      </span>
                      <button
                        onClick={() => setOpen({ problem: ref, friend })}
                        className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                      >
                        Solution
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            {friends.length > 0 && (
              <PersonPicker
                options={options}
                value={who}
                onSelect={(id) => {
                  setWho(id);
                  setSelected(null);
                }}
                className="mb-4"
              />
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {who === "you"
                  ? "Tap a day to see what you solved."
                  : loading
                    ? "Loading…"
                    : "Tap a day to see what they solved."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stepMonth(-1)}
                  disabled={atStart}
                  aria-label="Previous month"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => stepMonth(1)}
                  disabled={atEnd}
                  aria-label="Next month"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              className="mt-5 grid grid-cols-7 gap-2"
              role="grid"
              aria-label={calLabel}
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  role="columnheader"
                  aria-label={d}
                  className="text-center text-[11px] font-medium text-muted-foreground"
                >
                  {d[0]}
                </div>
              ))}
              {Array.from({ length: leadPad }, (_, i) => (
                <div key={`pad-${i}`} role="presentation" />
              ))}
              {cells.map((cell) => {
                const count = source.byDate[cell.key] ?? 0;
                const state = dayState(cell.key, today.key, count, streak);
                const solvedText =
                  count === 0 ? "no problems solved" : `${count} solved`;
                const stateText =
                  state === "today"
                    ? "today"
                    : state === "streak"
                      ? "streak day"
                      : "";
                return (
                  <button
                    key={cell.key}
                    role="gridcell"
                    onClick={() => count > 0 && setSelected(cell.key)}
                    disabled={count === 0}
                    aria-current={state === "today" ? "date" : undefined}
                    aria-label={[formatDayLabel(cell.key), solvedText, stateText]
                      .filter(Boolean)
                      .join(", ")}
                    className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition ${dayStateClass(state)} ${
                      count > 0
                        ? "cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        : "cursor-default"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <DayLegend className="mt-4" />


          </>
        )}
      </Dialog>

      {/*
        Rendered as a sibling, not a child: two nested <dialog> elements would
        both be in the top layer and fight over focus.
      */}
      {open &&
        (open.friend ? (
          <FriendSolutionDialog
            friend={open.friend}
            problem={open.problem}
            recent
            onClose={() => setOpen(null)}
          />
        ) : (
          <MySolutionDialog
            problem={open.problem}
            recent
            label="Solutions"
            onClose={() => setOpen(null)}
          />
        ))}
    </>
  );
}
