import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "../components/Modal";
import { ArrowLink, DiffLabel } from "../components/Controls";
import { PersonPicker, type PickerOption } from "../components/PersonPicker";
import { CAL_START, CAL_END } from "../data/calendar";
import { useData } from "../data/source";
import { api } from "../lib/api";
import { initialsOf, colorFor } from "../lib/avatar";
import { fmtShortDate } from "../lib/date";
import type { CalendarProblem, Friend, Month, ProblemRef } from "../types";

const keyFor = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function CalendarModal({
  cal,
  setCal,
  onClose,
  userName,
  onOpenProblem,
  onOpenFriendProblem,
}: {
  cal: Month;
  setCal: (m: Month) => void;
  onClose: () => void;
  userName: string;
  onOpenProblem: (p: ProblemRef) => void;
  onOpenFriendProblem: (friend: Friend, p: ProblemRef) => void;
}) {
  const { calendar, friends, getToken } = useData();
  const [selected, setSelected] = useState<string | null>(null);
  const [who, setWho] = useState("you");
  // Friend data is fetched on demand; "you" uses the already-loaded calendar.
  const [friendData, setFriendData] = useState<{
    byDate: Record<string, number>;
    byDateProblems: Record<string, CalendarProblem[]>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (who === "you") {
      setFriendData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.friendCalendar(getToken, who).catch(() => []),
      api.friendCalendarProblems(getToken, who).catch(() => []),
    ]).then(([days, probs]) => {
      if (cancelled) return;
      const byDate: Record<string, number> = {};
      for (const d of days ?? []) byDate[d.date] = d.count;
      const byDateProblems: Record<string, CalendarProblem[]> = {};
      for (const p of probs ?? []) {
        (byDateProblems[p.date] ??= []).push({ slug: p.slug, name: p.title, diff: p.difficulty });
      }
      setFriendData({ byDate, byDateProblems });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [who, getToken]);

  const source = who === "you" ? calendar : friendData ?? { byDate: {}, byDateProblems: {} };

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

  const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate();
  const calCounts = Array.from({ length: daysInMonth }, (_, i) => {
    const k = `${cal.year}-${String(cal.month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return source.byDate[k] ?? 0;
  });
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
  const selectedProblems = selected ? source.byDateProblems[selected] ?? [] : [];
  const whoLabel = who === "you" ? "You" : friends.find((f) => f.id === who)?.name ?? "";

  // One Modal, two pages. A shared min-height keeps the modal the same size when
  // you push into a day's detail (like the "see solution" view).
  return (
    <Modal
      eyebrow={selected ? calLabel : "Calendar"}
      title={selected ? fmtShortDate(selected) : calLabel}
      onClose={onClose}
      onBack={selected ? () => setSelected(null) : undefined}
    >
      <div>
        {selected ? (
          <>
            <p className="m-0 flex items-baseline gap-2">
              <span className="font-display text-[34px] font-light leading-none">{selectedProblems.length}</span>
              <span className="text-[15px] text-muted-foreground">solved {whoLabel === "You" ? "by you" : `by ${whoLabel}`}</span>
            </p>
            {selectedProblems.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">No problem details for this day.</p>
            ) : (
              <ul className="m-0 mt-5 list-none border-b border-border p-0">
                {selectedProblems.map((p) => {
                  const ref: ProblemRef = { name: p.name, slug: p.slug, diff: p.diff };
                  const friend = who === "you" ? null : friends.find((f) => f.id === who) ?? null;
                  return (
                    <li key={p.slug} className="flex items-center gap-4 border-t border-border py-3.5">
                      <span className="min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
                      <DiffLabel diff={p.diff} />
                      <ArrowLink onClick={() => (friend ? onOpenFriendProblem(friend, ref) : onOpenProblem(ref))}>Solution</ArrowLink>
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
                className="mb-5 max-w-[480px]"
              />
            )}
            <div className="flex max-w-[480px] items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {who === "you"
            ? "Tap a day to see what you solved."
            : loading
              ? "Loading…"
              : "Tap a day to see what they solved."}
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous month"
            onClick={() => stepMonth(-1)}
            disabled={atStart}
            className="grid h-10 w-10 place-items-center rounded-full border border-border-strong transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Next month"
            onClick={() => stepMonth(1)}
            disabled={atEnd}
            className="grid h-10 w-10 place-items-center rounded-full border border-border-strong transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-5 grid max-w-[480px] grid-cols-7 gap-1.5 border-t border-foreground pt-4">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="eyebrow pb-1 text-center text-[10px]">
            {d}
          </div>
        ))}
        {Array.from({ length: new Date(cal.year, cal.month, 1).getDay() }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {calCounts.map((count, i) => {
          const key = keyFor(cal.year, cal.month, i + 1);
          const tone =
            count >= 3
              ? "bg-medium text-background"
              : count === 2
              ? "bg-easy text-hard"
              : count === 1
              ? "bg-sky text-hard"
              : "text-muted-foreground";
          return (
            <button
              key={i}
              onClick={() => count > 0 && setSelected(key)}
              disabled={count === 0}
              title={`${i + 1}: ${count} solved`}
              className={`group/day relative flex aspect-square items-center justify-center rounded-md font-mono text-[13px] transition ${tone} ${
                count > 0 ? "cursor-pointer hover:opacity-90" : "cursor-default"
              }`}
            >
              {i + 1}
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-lg transition group-hover/day:opacity-100">
                {count} solved
              </span>
            </button>
          );
        })}
      </div>

            <div className="mt-5 flex max-w-[480px] items-center justify-end gap-2 text-[11px] text-muted-foreground">
              Less
              <span className="h-3 w-3 rounded-sm border border-border" />
              <span className="h-3 w-3 rounded-sm bg-sky" />
              <span className="h-3 w-3 rounded-sm bg-easy" />
              <span className="h-3 w-3 rounded-sm bg-medium" />
              More
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
