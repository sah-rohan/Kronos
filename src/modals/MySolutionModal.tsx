import { ExternalLink } from "lucide-react";
import { Modal } from "../components/Modal";
import { SolutionSlider } from "../components/SolutionSlider";
import { leetcodeUrl } from "../data/problems";
import { DiffLabel } from "../components/Controls";
import { useMySolutions } from "../lib/useSolutions";
import type { ProblemRef } from "../types";

export function MySolutionModal({
  problem,
  onClose,
  onBack,
  recent = false,
  label,
}: {
  problem: ProblemRef;
  onClose: () => void;
  onBack?: () => void;
  recent?: boolean;
  label?: string;
}) {
  const solutions = useMySolutions(problem.slug, recent);
  return (
    <Modal
      title={problem.name}
      eyebrow={label ?? (recent ? "Your recent solutions" : "Your best per language")}
      onClose={onClose}
      onBack={onBack}
    >
      <div className="flex items-center gap-4 border-b border-border pb-3">
        <DiffLabel diff={problem.diff} />
        <a
          href={leetcodeUrl(problem.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium underline-offset-4 hover:text-accent hover:underline"
        >
          Open on LeetCode <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <SolutionSlider solutions={solutions} />
    </Modal>
  );
}
