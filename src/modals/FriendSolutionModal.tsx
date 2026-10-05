import { ExternalLink } from "lucide-react";
import { Modal } from "../components/Modal";
import { SolutionSlider } from "../components/SolutionSlider";
import { leetcodeUrl } from "../data/problems";
import { Avatar, DiffLabel } from "../components/Controls";
import { useFriendSolutions } from "../lib/useSolutions";
import type { Friend, ProblemRef } from "../types";

export function FriendSolutionModal({
  friend,
  problem,
  onClose,
  onBack,
  recent = false, 
}: {
  friend: Friend;
  problem: ProblemRef;
  onClose: () => void;
  onBack?: () => void;
  recent?: boolean;
}) {
  const solutions = useFriendSolutions(friend.id, problem.slug, recent);
  return (
    <Modal title={problem.name} eyebrow={`${friend.name}'s solution`} onClose={onClose} onBack={onBack}>
      <div className="flex items-center gap-4 border-b border-border pb-3">
        <Avatar initials={friend.initials} className="h-8 w-8" />
        <span className="flex-1 text-[15px] font-medium">{friend.name}</span>
        <DiffLabel diff={problem.diff} />
        <a
          href={leetcodeUrl(problem.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium underline-offset-4 hover:text-accent hover:underline"
        >
          LeetCode <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <SolutionSlider solutions={solutions} />
    </Modal>
  );
}
