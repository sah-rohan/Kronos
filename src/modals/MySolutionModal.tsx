import { ExternalLink } from "lucide-react";
import { Modal } from "../components/Modal";
import { SolutionSlider } from "../components/SolutionSlider";
import { mySolutions } from "../data/friends";
import { diffStyles, leetcodeUrl } from "../data/problems";
import { useMySolutions } from "../lib/useSolutions";
import type { ProblemRef } from "../types";

export function MySolutionModal({ problem, onClose }: { problem: ProblemRef; onClose: () => void }) {
  const solutions = useMySolutions(problem.slug, mySolutions(problem.slug));
  return (
    <Modal title={problem.name} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-sm font-medium">Your best solutions</div>
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
