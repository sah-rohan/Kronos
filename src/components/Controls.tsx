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

const DIFF_TONE: Record<string, string> = { Medium: "text-medium", Hard: "font-semibold text-hard" };

export function DiffLabel({ diff }: { diff: string }) {
  return <span className={`eyebrow shrink-0 ${DIFF_TONE[diff] ?? ""}`}>{diff}</span>;
}

// The big number + caption line that heads a list ("12 of 150 solved …").
export function Tally({ value, children, className = "" }: { value: ReactNode; children: ReactNode; className?: string }) {
  return (
    <p className={`m-0 flex items-baseline gap-2 ${className}`}>
      <span className="font-display text-[34px] font-light leading-none">{value}</span>
      <span className="text-[15px] text-muted-foreground">{children}</span>
    </p>
  );
}

// Round prev/next arrow button.
export function StepButton({
  label,
  onClick,
  disabled,
  primary = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-30 ${
        primary
          ? "bg-ink text-ink-foreground transition-opacity hover:opacity-90"
          : "border border-border-strong transition-colors hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
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

// Initials in a circle; `me` marks the signed-in user.
export function Avatar({
  initials,
  me = false,
  size = "md",
  className = "",
  children,
}: {
  initials: string;
  me?: boolean;
  size?: "sm" | "md";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full text-xs font-medium ${size === "sm" ? "h-8 w-8" : "h-9 w-9"} ${
        me ? "bg-ink text-ink-foreground" : "bg-border-strong text-foreground"
      } ${className}`}
    >
      {initials}
      {children}
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

const BUTTON_LOOK = {
  primary: "bg-ink text-ink-foreground hover:opacity-90",
  secondary: "border border-border-strong text-foreground hover:bg-muted",
  danger: "border border-danger/50 text-danger hover:bg-danger/10",
};

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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition disabled:opacity-50 ${BUTTON_LOOK[variant]} ${className}`}
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
