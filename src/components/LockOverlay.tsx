import { Lock, Clock } from "lucide-react";

// Wraps a LeetCode-powered card. When locked, the card's content is blurred and
// non-interactive, with an overlay prompting the user to link their LeetCode
// username (or telling them it's pending admin approval).
export function LockOverlay({
  locked,
  pending,
  onUnlock,
  className = "",
  children,
}: {
  locked: boolean;
  pending?: boolean;
  onUnlock: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className={`relative h-full ${className}`}>
      <div aria-hidden className="pointer-events-none h-full select-none blur-[6px] saturate-50">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center rounded-[24px] bg-background/40 p-6 text-center">
        <div className="flex flex-col items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-border bg-background/80 text-coral">
            {pending ? <Clock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </span>
          {pending ? (
            <>
              <div className="mt-3 text-sm font-medium">Pending approval</div>
              <p className="mt-1 max-w-[15rem] text-xs text-muted-foreground">
                Your LeetCode username is linked. An admin will verify it to unlock these stats.
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 text-sm font-medium">LeetCode stats locked</div>
              <p className="mt-1 max-w-[15rem] text-xs text-muted-foreground">
                Link your LeetCode username to unlock progress, streaks, friends, and the roadmap leaderboard.
              </p>
              <button
                onClick={onUnlock}
                className="mt-4 rounded-full bg-coral px-4 py-2 text-xs font-medium text-coral-foreground transition hover:opacity-95"
              >
                Add LeetCode username
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
