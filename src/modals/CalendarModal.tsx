import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "../components/Modal";
import { ArrowLink, DiffLabel, StepButton, Tally } from "../components/Controls";
import { PersonPicker, type PickerOption } from "../components/PersonPicker";
import { useData } from "../data/context";
import { useFetch } from "../data/hooks";
import { toCalendar, toPerson, type CalendarData } from "../data/transform";
import { api } from "../lib/api";
import { CAL_END, CAL_START, WEEKDAYS, heatTone, monthCounts, sameMonth } from "../lib/calendar";
import { dayKey, fmtShortDate } from "../lib/date";
import type { Friend, Month, ProblemRef } from "../types";

const EMPTY: CalendarData = { byDate: {}, byDateProblems: {} };

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
  const friend = who === "you" ? null : friends.find((f) => f.id === who) ?? null;

  // Your calendar is already loaded; a friend's is fetched when you pick them.
  const friendKey = friend ? friend.id : null;
  const friendData = useFetch(
    friendKey,
    () =>
      Promise.all([
        api.friendCalendar(getToken, who).catch(() => []),
        api.friendCalendarProblems(getToken, who).catch(() => []),
      ]).then(([days, probs]) => ({ id: who, data: toCalendar(days ?? [], probs ?? []) })),
    null as { id: string; data: CalendarData } | null,
  );
  const friendLoaded = friendData?.id === who;
  const source = friend ? (friendLoaded ? friendData!.data : EMPTY) : calendar;

  const options: PickerOption[] = [
    { id: "you", ...toPerson(userName), name: "You" },
    ...friends.map((f) => ({ id: f.id, name: f.name, initials: f.initials, color: f.color, username: f.username })),
  ];

  const calCounts = monthCounts(source.byDate, cal.year, cal.month);
  const calLabel = new Date(cal.year, cal.month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const stepMonth = (dir: number) => {
    const d = new Date(cal.year, cal.month + dir, 1);
    setCal({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(null);
  };
  const selectedProblems = selected ? source.byDateProblems[selected] ?? [] : [];

  return (
    <Modal
      eyebrow={selected ? calLabel : "Calendar"}
      title={selected ? fmtShortDate(selected) : calLabel}
      onClose={onClose}
      onBack={selected ? () => setSelected(null) : undefined}
    >
      {selected ? (
        <>
          <Tally value={selectedProblems.length}>solved {friend ? `by ${friend.name}` : "by you"}</Tally>
          {selectedProblems.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">No problem details for this day.</p>
          ) : (
            <ul className="m-0 mt-5 list-none border-b border-border p-0">
              {selectedProblems.map((p) => (
                <li key={p.slug} className="flex items-center gap-4 border-t border-border py-3.5">
                  <span className="min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
                  <DiffLabel diff={p.diff} />
                  <ArrowLink onClick={() => (friend ? onOpenFriendProblem(friend, p) : onOpenProblem(p))}>Solution</ArrowLink>
                </li>
              ))}
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
              {!friend ? "Tap a day to see what you solved." : !friendLoaded ? "Loading…" : "Tap a day to see what they solved."}
            </p>
            <div className="flex items-center gap-2">
              <StepButton label="Previous month" onClick={() => stepMonth(-1)} disabled={sameMonth(cal, CAL_START)}>
                <ChevronLeft className="h-4 w-4" />
              </StepButton>
              <StepButton label="Next month" onClick={() => stepMonth(1)} disabled={sameMonth(cal, CAL_END)}>
                <ChevronRight className="h-4 w-4" />
              </StepButton>
            </div>
          </div>
          <div className="mt-5 grid max-w-[480px] grid-cols-7 gap-1.5 border-t border-foreground pt-4">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="eyebrow pb-1 text-center text-[10px]">
                {d}
              </div>
            ))}
            {Array.from({ length: new Date(cal.year, cal.month, 1).getDay() }, (_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {calCounts.map((count, i) => (
              <button
                key={i}
                onClick={() => count > 0 && setSelected(dayKey(cal.year, cal.month, i + 1))}
                disabled={count === 0}
                title={`${i + 1}: ${count} solved`}
                className={`group/day relative flex aspect-square items-center justify-center rounded-md font-mono text-[13px] transition ${
                  heatTone(count) ?? "text-muted-foreground"
                } ${count > 0 ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
              >
                {i + 1}
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-lg transition group-hover/day:opacity-100">
                  {count} solved
                </span>
              </button>
            ))}
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
    </Modal>
  );
}
