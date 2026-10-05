import { useState, type ReactNode } from "react";
import { AtSign, ChevronUp, LogOut, Moon, ShieldCheck, Sun, Zap } from "lucide-react";
import { SignOutButton } from "@clerk/clerk-react";
import { useClerk } from "../lib/env";

type ThemeMode = "auto" | "light" | "dark";

export type NavItem = { label: string; onClick: () => void; badge?: string; active?: boolean };

export function KronosMark({ className = "h-[22px] w-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function NavButton({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
      className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm transition-colors ${
        item.active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {item.label}
      {item.badge && <span className="font-mono text-xs text-muted-foreground">{item.badge}</span>}
    </button>
  );
}

function NavGroup({ label, items }: { label?: string; items: NavItem[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <div className="eyebrow px-3 pb-2">{label}</div>}
      {items.map((i) => (
        <NavButton key={i.label} item={i} />
      ))}
    </div>
  );
}

export function AccountMenu({
  name,
  initials,
  subtitle,
  theme,
  onChangeTheme,
  onChangeUsername,
  isAdmin,
  onAdmin,
  placement = "up",
  compact = false,
}: {
  name: string;
  initials: string;
  subtitle?: string;
  theme: ThemeMode;
  onChangeTheme: (t: ThemeMode) => void;
  onChangeUsername: () => void;
  isAdmin?: boolean;
  onAdmin?: () => void;
  placement?: "up" | "down";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const item =
    "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted";
  const pick = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };
  const themes: { key: ThemeMode; label: string; icon: ReactNode; hint?: string }[] = [
    { key: "auto", label: "Auto", icon: <Zap className="h-4 w-4" />, hint: "Day/Night" },
    { key: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { key: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={compact ? "Account" : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-muted ${compact ? "p-1.5" : "p-3"}`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-ink-foreground">
          {initials}
        </span>
        {!compact && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{name}</span>
              {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
            </span>
            <ChevronUp className={`h-4 w-4 text-muted-foreground transition ${open ? "" : "rotate-180"}`} />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 w-64 rounded-xl border border-border bg-card p-1.5 shadow-[0_18px_40px_-18px_rgba(26,25,21,0.35)] ${
              placement === "up" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"
            }`}
          >
            <div className="eyebrow px-3 py-2">Theme</div>
            {themes.map((t) => (
              <button key={t.key} type="button" onClick={pick(() => onChangeTheme(t.key))} className={`${item} ${theme === t.key ? "bg-muted" : ""}`}>
                {t.icon}
                <span className="flex-1 text-left">
                  {t.label}
                  {t.hint && <span className="block text-[11px] text-muted-foreground">{t.hint}</span>}
                </span>
                {theme === t.key && <span className="h-2 w-2 rounded-full bg-accent" />}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button type="button" onClick={pick(onChangeUsername)} className={item}>
              <AtSign className="h-4 w-4" />
              Change LeetCode username
            </button>
            {isAdmin && onAdmin && (
              <button type="button" onClick={pick(onAdmin)} className={item}>
                <ShieldCheck className="h-4 w-4" />
                Manage members
              </button>
            )}
            <div className="my-1 h-px bg-border" />
            {useClerk ? (
              <SignOutButton>
                <button type="button" className={`${item} text-danger`}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </SignOutButton>
            ) : (
              <button type="button" className={`${item} text-danger`} onClick={() => setOpen(false)}>
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar({
  primary,
  study,
  account,
}: {
  primary: NavItem[];
  study: NavItem[];
  account: ReactNode;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-7 overflow-y-auto border-r border-border bg-sidebar px-4 py-7 lg:flex">
      <div className="flex items-center gap-2.5 px-3">
        <KronosMark />
        <span className="font-display text-2xl">Kronos</span>
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-7">
        <NavGroup items={primary} />
        <NavGroup label="Study" items={study} />
      </nav>
      <div className="mt-auto border-t border-border pt-3">{account}</div>
    </aside>
  );
}

export function MobileBar({ account }: { account: ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2">
        <KronosMark className="h-5 w-5" />
        <span className="font-display text-xl">Kronos</span>
      </div>
      {account}
    </header>
  );
}
