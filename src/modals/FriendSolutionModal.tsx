import { ExternalLink } from "lucide-react";
import { Modal } from "../components/Modal";
import { SolutionSlider } from "../components/SolutionSlider";
import { diffStyles, leetcodeUrl } from "../data/problems";
import { useFriendSolutions } from "../lib/useSolutions";
import type { Friend, ProblemRef } from "../types";

export function FriendSolutionModal({
  friend,
  problem,
  onClose,
  onBack,
}: {
  friend: Friend;
  problem: ProblemRef;
  onClose: () => void;
  onBack?: () => void;
}) {
  const solutions = useFriendSolutions(friend.id, problem.slug);
  return (
    <Modal title={problem.name} onClose={onClose} onBack={onBack}>
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-medium ${friend.color}`}>
          {friend.initials}
        </div>
        <div className="flex-1 text-sm font-medium">{friend.name}</div>
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
      </div>

      <SolutionSlider solutions={solutions} />
    </Modal>
  );
}
