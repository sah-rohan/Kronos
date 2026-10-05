import { ExternalLink } from "lucide-react";
import { Modal } from "../components/Modal";
import { SolutionSlider } from "../components/SolutionSlider";
import { Avatar, DiffLabel } from "../components/Controls";
import { useSolutions } from "../data/hooks";
import { leetcodeUrl } from "../lib/leetcode";
import type { Friend, ProblemRef } from "../types";

// Your accepted solutions to a problem, or a friend's when `friend` is set.
export function SolutionModal({
  problem,
  friend,
  recent = false,
  label,
  onClose,
  onBack,
}: {
  problem: ProblemRef;
  friend?: Friend;
  recent?: boolean;
  label?: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  const solutions = useSolutions(problem.slug, recent, friend?.id);
  const eyebrow = friend
    ? `${friend.name}'s solution`
    : label ?? (recent ? "Your recent solutions" : "Your best per language");
  return (
    <Modal title={problem.name} eyebrow={eyebrow} onClose={onClose} onBack={onBack}>
      <div className="flex items-center gap-4 border-b border-border pb-3">
        {friend && (
          <>
            <Avatar initials={friend.initials} />
            <span className="flex-1 text-[15px] font-medium">{friend.name}</span>
          </>
        )}
        <DiffLabel diff={problem.diff} />
        <a
          href={leetcodeUrl(problem.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium underline-offset-4 hover:text-accent hover:underline"
        >
          {friend ? "LeetCode" : "Open on LeetCode"} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <SolutionSlider solutions={solutions} />
    </Modal>
  );
}
