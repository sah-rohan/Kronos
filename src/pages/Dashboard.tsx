/**
 * The dashboard — the index route, and what `App.tsx` used to be minus the
 * chrome (now `AppShell`) and minus the 13 pieces of modal state (now the URL).
 *
 * What is left here is genuinely dashboard-local: the admin session-expiry
 * alert, the LeetCode unlock dialog opened by `LockOverlay`, and the calendar
 * overlay. `?board=` is read from the URL, not from component state, so the
 * My Progress and Leaderboard cards can no longer disagree about what they show.
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { greeting } from "../lib/greeting";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { daysUntil } from "../lib/date";
import { useDashboardBoard } from "../lib/searchParams";
import { DEFAULT_TRACK, isTrack, type Track } from "../lib/slugs";
import { useShell } from "../app/shell";
import { LockOverlay } from "../components/LockOverlay";
import { LinkLeetCodeDialog } from "../overlays/LinkLeetCodeDialog";
import { CalendarDialog } from "../overlays/CalendarDialog";
import { Greeting } from "../sections/Greeting";
import { MyProgressCard } from "../sections/MyProgressCard";
import { LeaderboardCard } from "../sections/LeaderboardCard";
import { MyFriendsCard } from "../sections/MyFriendsCard";
import { CurrentStreakCard } from "../sections/CurrentStreakCard";
import { RecentActivityCard } from "../sections/RecentActivityCard";
import { SystemDesignCard } from "../systemdesign/SystemDesignCard";
import { GenAICard } from "../systemdesign/GenAICard";
import { CloudCard } from "../systemdesign/CloudCard";
import { NetworkingCard } from "../systemdesign/NetworkingCard";

export function Dashboard() {
  const { isAdmin, userName, lcUnlocked, lcPending, token, reloadMe } = useShell();
  const { getToken } = useData();
  const location = useLocation();

  const [board, setBoard] = useDashboardBoard();
  const [linkOpen, setLinkOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Admin-only: warn when the LeetCode session token is near/at expiry.
  const [sessionExpiry, setSessionExpiry] = useState<string>("");
  useEffect(() => {
    if (isAdmin) {
      api
        .adminLeetcodeSession(getToken)
        .then((s) => setSessionExpiry(s.expiresAt))
        .catch(() => {});
    }
  }, [isAdmin, getToken]);
  const expiryDays = daysUntil(sessionExpiry);
  const showExpiryAlert = isAdmin && expiryDays !== null && expiryDays <= 7;

  const hello = greeting(new Date());

  // When a card is locked, the LockOverlay wrapper becomes the grid item, so it
  // must carry the card's column span (and fill height) for the rows to line up.
  const lock = (node: React.ReactNode, span = "lg:col-span-1") => (
    <LockOverlay
      locked={!lcUnlocked}
      pending={lcPending}
      onUnlock={() => setLinkOpen(true)}
      className={span}
    >
      {node}
    </LockOverlay>
  );

  // The leaderboard card only needs a roadmap when the board IS a roadmap; for
  // the System Design boards it renders the SD ranking and ignores this.
  const roadmap: Track = isTrack(board) ? board : DEFAULT_TRACK;

  // Set by RequireLeetCode when someone deep-links a locked route.
  const lockedFrom = (location.state as { lockedFrom?: string } | null)?.lockedFrom;

  return (
    <>
      <Greeting hello={hello} name={userName.split(" ")[0]} />

      {lockedFrom && !lcUnlocked && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{lockedFrom}</span> needs a
          linked LeetCode account. Link one below to unlock it.
        </div>
      )}

      {showExpiryAlert && (
        <div className="flex w-full items-center gap-3 rounded-2xl border border-coral/50 bg-coral/10 px-4 py-3 text-left text-sm">
          <span className="font-medium text-coral">
            {expiryDays! < 0
              ? "LeetCode session expired"
              : `LeetCode session expires in ${expiryDays} day${expiryDays === 1 ? "" : "s"}`}
          </span>
          <span className="text-muted-foreground">
            {expiryDays! < 0
              ? "Sync is paused until you replace the token."
              : "Replace it soon to keep syncing."}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            Open the avatar menu → Manage members
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {lock(<MyProgressCard board={board} onBoard={setBoard} />)}
        {lock(<LeaderboardCard board={board} roadmap={roadmap} />, "lg:col-span-2")}
        {lock(<MyFriendsCard />)}
        {lock(<CurrentStreakCard onOpenCalendar={() => setCalendarOpen(true)} />)}
        {lock(<RecentActivityCard userName={userName} />)}
        <SystemDesignCard />
        <GenAICard />
        <CloudCard />
        <NetworkingCard />
      </div>

      {linkOpen && token && (
        <LinkLeetCodeDialog
          token={token}
          onClose={() => setLinkOpen(false)}
          onLinked={reloadMe}
        />
      )}

      {calendarOpen && (
        <CalendarDialog userName={userName} onClose={() => setCalendarOpen(false)} />
      )}
    </>
  );
}
