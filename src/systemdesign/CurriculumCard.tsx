import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ABOVE_STRETCH, EntryPoint } from "../components/EntryPoint";

export type CurriculumItem = {
  slug: string;
  title: string;
  detail?: string;
  href: string;
  done?: boolean;
};

export const PREVIEW_COUNT = 5;

export function CurriculumCard({
  title,
  blurb,
  icon: Icon,
  items,
  total,
  noun,
  solvedCount,
  meta,
  indexHref,
  action,
  numbered = false,
  children,
}: {
  title: string;
  blurb: string;
  icon: LucideIcon;
  items: CurriculumItem[];
  total: number;
  noun: string;
  solvedCount?: number;
  meta?: string;
  indexHref: string;
  action: string;
  numbered?: boolean;
  children?: React.ReactNode;
}) {
  const remaining = total - items.length;

  return (
    <EntryPoint
      to={indexHref}
      action={action}
      ariaLabel={`${action} — ${title}`}
      className="h-full lg:col-span-1"
    >
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">{title}</div>
        <Icon className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>

      {children}

      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>
          {solvedCount !== undefined ? `${solvedCount}/${total} solved` : meta}
        </span>
        <span>
          {total} {noun}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={item.slug}>
            <Link
              to={item.href}
              className={`${ABOVE_STRETCH} flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition hover:border-coral/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
            >
              {numbered && (
                <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                {item.detail && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </span>
              {item.done && (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3fae6a]/15 text-[#3fae6a]">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          + {remaining} more {noun}
        </p>
      )}
    </EntryPoint>
  );
}
