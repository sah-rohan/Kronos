/**
 * Transient overlay — a single problem's solutions, opened from a row on the
 * problem tracker, a user profile, or an activity list.
 *
 * Decision (recorded in docs/REVIEW.md): this stays an overlay rather
 * than becoming a route. It is not in the Phase 1 route table; it is row detail
 * whose meaning depends on the list behind it, and it always has that list as
 * its natural back destination. Promoting it to a route would need a
 * `/problem/:slug` entry that the brief does not define.
 *
 * Merged from `modals/MySolutionModal.tsx` and `modals/FriendSolutionModal.tsx`,
 * which differed only in whose solutions they fetched and the header row. This
 * is also the only place `highlight.js` is reachable from (via `SolutionSlider`),
 * so it stays inside lazily-loaded route chunks and out of the shell bundle.
 */
import { ExternalLink } from "lucide-react";
import { Dialog } from "../components/Dialog";
import { SolutionSlider } from "../components/SolutionSlider";
import { diffStyles, leetcodeUrl } from "../data/problems";
import { useFriendSolutions, useMySolutions } from "../lib/useSolutions";
import type { Friend, ProblemRef } from "../types";

export function MySolutionDialog({
  problem,
  onClose,
  recent = false,
  label,
}: {
  problem: ProblemRef;
  onClose: () => void;
  recent?: boolean;
  label?: string;
}) {
  const solutions = useMySolutions(problem.slug, recent);
  return (
    <Dialog title={problem.name} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-sm font-medium">
          {label ?? (recent ? "Your recent solutions" : "Your best per language")}
        </div>
        <ProblemLinks problem={problem} />
      </div>
      <SolutionSlider solutions={solutions} />
    </Dialog>
  );
}

export function FriendSolutionDialog({
  friend,
  problem,
  onClose,
  recent = false,
}: {
  friend: Friend;
  problem: ProblemRef;
  onClose: () => void;
  recent?: boolean;
}) {
  const solutions = useFriendSolutions(friend.id, problem.slug, recent);
  return (
    <Dialog title={problem.name} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-medium ${friend.color}`}>
          {friend.initials}
        </div>
        <div className="flex-1 text-sm font-medium">{friend.name}</div>
        <ProblemLinks problem={problem} />
      </div>
      <SolutionSlider solutions={solutions} />
    </Dialog>
  );
}

/** The LeetCode link + difficulty pill shared by both dialogs. */
function ProblemLinks({ problem }: { problem: ProblemRef }) {
  return (
    <>
      <a
        href={leetcodeUrl(problem.slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted"
      >
        LeetCode <ExternalLink className="h-3 w-3" />
      </a>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[problem.diff]}`}>
        {problem.diff}
      </span>
    </>
  );
}
