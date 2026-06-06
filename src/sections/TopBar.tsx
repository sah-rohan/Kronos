import { useState } from "react";
import { ChevronDown, Moon, Sun, AtSign, LogOut, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@clerk/clerk-react";
import { useClerk } from "../lib/env";

export function TopBar({
  name,
  initials,
  dark,
  onToggleDark,
  onChangeUsername,
  isAdmin,
  onAdmin,
}: {
  name: string;
  initials: string;
  dark: boolean;
  onToggleDark: () => void;
  onChangeUsername: () => void;
  isAdmin?: boolean;
  onAdmin?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted";

  return (
    <div className="flex items-start justify-between">
      <div className="flex h-11 items-center rounded-2xl bg-[#111] px-5 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]">
        <span className="font-display text-xl tracking-[0.08em] text-white">KRONOS</span>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full border border-border bg-white/50 py-1.5 pl-1.5 pr-3 backdrop-blur-sm transition hover:bg-white/80"
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#111] text-xs font-medium text-white">
            {initials}
          </div>
          <span className="text-sm font-medium text-foreground">{name}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[0_18px_40px_-14px_rgba(7,55,129,0.4)] backdrop-blur-md">
              <button onClick={() => { onToggleDark(); setOpen(false); }} className={item}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {dark ? "Light mode" : "Dark mode"}
              </button>
              <button onClick={() => { onChangeUsername(); setOpen(false); }} className={item}>
                <AtSign className="h-4 w-4" />
                Change LeetCode username
              </button>
              {isAdmin && onAdmin && (
                <button onClick={() => { onAdmin(); setOpen(false); }} className={item}>
                  <ShieldCheck className="h-4 w-4" />
                  Approve members
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
                <button className={`${item} text-coral`} onClick={() => setOpen(false)}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
