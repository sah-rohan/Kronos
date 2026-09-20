import { useState } from "react";
import {
  ChevronDown,
  Moon,
  Sun,
  Zap,
  AtSign,
  LogOut,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { SignOutButton } from "@clerk/clerk-react";
import { useClerk } from "../lib/env";
import { useData } from "../data/context";
import { api } from "../lib/api";

export function TopBar({
  name,
  initials,
  theme,
  onChangeTheme,
  onChangeUsername,
  isAdmin,
  onAdmin,
}: {
  name: string;
  initials: string;
  theme: "auto" | "light" | "dark";
  onChangeTheme: (theme: "auto" | "light" | "dark") => void;
  onChangeUsername: () => void;
  isAdmin?: boolean;
  onAdmin?: () => void;
}) {
  const { refresh, getToken } = useData();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await api.syncNow(getToken).catch(() => {});
      await refresh();
    } finally {
      setSyncing(false);
    }
  };
  const item =
    "flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted";

  return (
    <div className="flex items-start justify-between">
      <div className="flex h-11 items-center rounded-2xl bg-[#111] px-5 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]">
        <span className="font-display text-xl tracking-[0.08em] text-white">
          KRONOS
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={doSync}
          disabled={syncing}
          aria-label="Sync now"
          title="Sync now"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-white/50 text-muted-foreground backdrop-blur-sm transition hover:bg-white/80 disabled:opacity-60 dark:bg-white/20 dark:hover:bg-white/30"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-full border border-border bg-white/50 py-1.5 pl-1.5 pr-3 backdrop-blur-sm transition hover:bg-white/80 dark:bg-white/20 dark:hover:bg-white/30"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#111] text-xs font-medium text-white">
              {initials}
            </div>
            <span className="text-sm font-medium text-foreground">{name}</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[0_18px_40px_-14px_rgba(7,55,129,0.4)] backdrop-blur-md">
                <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Theme
                </div>
                <button
                  onClick={() => {
                    onChangeTheme("auto");
                    setOpen(false);
                  }}
                  className={`${item} ${theme === "auto" ? "bg-muted text-coral" : ""}`}
                >
                  <Zap className="h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div>Auto</div>
                    <div className="text-[11px] text-muted-foreground">
                      Day/Night
                    </div>
                  </div>
                  {theme === "auto" && (
                    <div className="h-2 w-2 rounded-full bg-coral" />
                  )}
                </button>
                <button
                  onClick={() => {
                    onChangeTheme("light");
                    setOpen(false);
                  }}
                  className={`${item} ${theme === "light" ? "bg-muted text-coral" : ""}`}
                >
                  <Sun className="h-4 w-4" />
                  <div className="flex-1 text-left">Light</div>
                  {theme === "light" && (
                    <div className="h-2 w-2 rounded-full bg-coral" />
                  )}
                </button>
                <button
                  onClick={() => {
                    onChangeTheme("dark");
                    setOpen(false);
                  }}
                  className={`${item} ${theme === "dark" ? "bg-muted text-coral" : ""}`}
                >
                  <Moon className="h-4 w-4" />
                  <div className="flex-1 text-left">Dark</div>
                  {theme === "dark" && (
                    <div className="h-2 w-2 rounded-full bg-coral" />
                  )}
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => {
                    onChangeUsername();
                    setOpen(false);
                  }}
                  className={item}
                >
                  <AtSign className="h-4 w-4" />
                  Change LeetCode username
                </button>
                {isAdmin && onAdmin && (
                  <button
                    onClick={() => {
                      onAdmin();
                      setOpen(false);
                    }}
                    className={item}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Manage members
                  </button>
                )}
                <div className="my-1 h-px bg-border" />
                {useClerk ? (
                  <SignOutButton>
                    <button className={`${item} text-coral`}>
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </SignOutButton>
                ) : (
                  <button
                    className={`${item} text-coral`}
                    onClick={() => setOpen(false)}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
