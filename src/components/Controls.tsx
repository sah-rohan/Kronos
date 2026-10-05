import type { ReactNode } from "react";
import { Search } from "lucide-react";

export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  className = "",
}: {
  tabs: { key: K; label: ReactNode }[];
  value: K;
  onChange: (k: K) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex gap-6 overflow-x-auto border-b border-border ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          onClick={() => onChange(t.key)}
          className={`-mb-px min-h-11 shrink-0 whitespace-nowrap border-b text-sm transition-colors ${
            t.key === value ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`flex min-h-10 items-center gap-2.5 rounded-full border border-border-strong px-4 text-sm focus-within:border-foreground ${className}`}>
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, "")}
        className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

export function DiffLabel({ diff }: { diff: string }) {
  const tone = diff === "Hard" ? "font-semibold text-hard" : diff === "Medium" ? "text-medium" : "";
  return <span className={`eyebrow shrink-0 ${tone}`}>{diff}</span>;
}

export function ArrowLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex min-h-9 shrink-0 items-center text-[13px] font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
    >
      {children} →
    </button>
  );
}

export function Avatar({ initials, className = "", me = false }: { initials: string; className?: string; me?: boolean }) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-medium ${
        me ? "bg-ink text-ink-foreground" : "bg-border-strong text-foreground"
      } ${className}`}
    >
      {initials}
    </span>
  );
}

export function PersonRow({
  initials,
  name,
  sub,
  trailing,
  onClick,
}: {
  initials: string;
  name: string;
  sub?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <Avatar initials={initials} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{name}</span>
        {sub && <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>}
      </span>
      {trailing}
    </>
  );
  const row = "flex w-full items-center gap-3.5 border-t border-border py-3.5 text-left";
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={`${row} transition-colors hover:text-accent`}>
          {body}
        </button>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const look =
    variant === "primary"
      ? "bg-ink text-ink-foreground hover:opacity-90"
      : variant === "danger"
        ? "border border-danger/50 text-danger hover:bg-danger/10"
        : "border border-border-strong text-foreground hover:bg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition disabled:opacity-50 ${look} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionHead({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-foreground pb-2.5">
      <h2 className="m-0 font-display text-[22px] font-normal leading-tight">{title}</h2>
      {meta && <span className="font-mono text-xs text-muted-foreground">{meta}</span>}
    </div>
  );
}
