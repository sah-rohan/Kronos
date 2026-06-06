import { ExternalLink } from "lucide-react";
import { Modal } from "../components/Modal";
import { SolutionSlider } from "../components/SolutionSlider";
import { friendSolutions } from "../data/friends";
import { diffStyles, neetcodeUrl } from "../data/problems";
import type { Friend, ProblemRef } from "../types";

export function FriendSolutionModal({
  friend,
  problem,
  onClose,
}: {
  friend: Friend;
  problem: ProblemRef;
  onClose: () => void;
}) {
  return (
    <Modal title={problem.name} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-medium ${friend.color}`}>
          {friend.initials}
        </div>
        <div className="flex-1 text-sm font-medium">{friend.name}</div>
        <a
          href={neetcodeUrl(problem.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted"
        >
          NeetCode <ExternalLink className="h-3 w-3" />
        </a>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[problem.diff]}`}>
          {problem.diff}
        </span>
      </div>

      <SolutionSlider solutions={friendSolutions(friend, problem.name)} />
    </Modal>
  );
}
