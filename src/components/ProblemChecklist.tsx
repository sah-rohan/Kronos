import { Check, ExternalLink } from "lucide-react";
import { leetcodeUrl } from "../lib/leetcode";
import { ArrowLink, DiffLabel, SectionHead } from "./Controls";
import { OptimalTag } from "./OptimalTag";
import type { ProblemRef } from "../types";

type Item = { name: string; slug: string; diff: string; done: boolean; optimal: boolean };

export function ProblemChecklist({
  categories,
  onOpen,
  openLabel = "Solution",
}: {
  categories: { title: string; items: Item[] }[];
  onOpen: (p: ProblemRef) => void;
  openLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-9">
      {categories.map((c) => (
        <section key={c.title}>
          <SectionHead title={c.title} meta={`${c.items.filter((p) => p.done).length} / ${c.items.length}`} />
          <ul className="m-0 list-none p-0">
            {c.items.map((p) => (
              <li
                key={p.slug || p.name}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-3"
              >
                <span
                  aria-label={p.done ? "Solved" : "Not solved"}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    p.done ? "bg-accent text-accent-foreground" : "border border-border-strong"
                  }`}
                >
                  {p.done && <Check className="h-3 w-3" strokeWidth={2.5} />}
                </span>
                <span className={`min-w-0 flex-1 truncate text-[15px] ${p.done ? "" : "text-muted-foreground"}`}>{p.name}</span>
                <span className="flex items-center gap-4">
                  {p.done && p.optimal && <OptimalTag />}
                  <DiffLabel diff={p.diff} />
                  <a
                    href={leetcodeUrl(p.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${p.name} on LeetCode`}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <span className="w-[76px] text-right">
                    {p.done && <ArrowLink onClick={() => onOpen({ name: p.name, slug: p.slug, diff: p.diff })}>{openLabel}</ArrowLink>}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
