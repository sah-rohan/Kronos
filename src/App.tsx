import { useEffect, useState } from "react";
import { greeting } from "./lib/greeting";
import { initialsOf } from "./lib/avatar";
import { CAL_START } from "./data/calendar";
import { useData } from "./data/source";
import { api, type TokenFn } from "./lib/api";
import { daysUntil } from "./lib/date";
import { LockOverlay } from "./components/LockOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LinkLeetCodeModal } from "./modals/LinkLeetCodeModal";
import { effectiveDark } from "./lib/theme";
import type { Friend, Month, ProblemRef, ProblemList } from "./types";
import { Clouds } from "./components/Clouds";
import { SystemDesignCard } from "./systemdesign/SystemDesignCard";
import { SystemDesignModal } from "./systemdesign/SystemDesignModal";
import { ComponentsModal } from "./systemdesign/ComponentsModal";
import { CloudCard } from "./systemdesign/CloudCard";
import { CloudModal } from "./systemdesign/CloudModal";
import { NetworkingCard } from "./systemdesign/NetworkingCard";
import { NetworkingModal } from "./systemdesign/NetworkingModal";
import { GenAICard } from "./systemdesign/GenAICard";
import { GENAI_PROBLEMS } from "./systemdesign/genai";
import { SD_PROBLEMS } from "./systemdesign/problems";
import { TopBar } from "./sections/TopBar";
import { Greeting } from "./sections/Greeting";
import { MyProgressCard } from "./sections/MyProgressCard";
import { LeaderboardCard } from "./sections/LeaderboardCard";
import { MyFriendsCard } from "./sections/MyFriendsCard";
import { CurrentStreakCard } from "./sections/CurrentStreakCard";
import { RecentActivityCard } from "./sections/RecentActivityCard";
import { ProgressModal } from "./modals/ProgressModal";
import { MySolutionModal } from "./modals/MySolutionModal";
import { CalendarModal } from "./modals/CalendarModal";
import { LeaderboardModal } from "./modals/LeaderboardModal";
import { RecentActivityModal } from "./modals/RecentActivityModal";
import { FriendsModal } from "./modals/FriendsModal";
import { FriendProgressModal } from "./modals/FriendProgressModal";
import { FriendSolutionModal } from "./modals/FriendSolutionModal";
import { ChangeUsernameModal } from "./modals/ChangeUsernameModal";
import { AdminModal } from "./modals/AdminModal";
import { JobAlertsCard } from "./sections/JobAlertsCard";

type ThemeMode = "auto" | "light" | "dark";

function App({
  isAdmin = false,
  userName = "Jordan Dev",
  initialTheme = "auto",
  lcUnlocked = true,
  lcPending = false,
  token,
  onReloadMe,
}: {
  isAdmin?: boolean;
  userName?: string;
  initialTheme?: ThemeMode;
  lcUnlocked?: boolean;
  lcPending?: boolean;
  token?: TokenFn;
  onReloadMe?: () => void;
}) {
  const { removeFriend, getToken } = useData();
  const [linkOpen, setLinkOpen] = useState(false);
  // When a card is locked, the LockOverlay wrapper becomes the grid item, so it
  // must carry the card's column span (and fill height) for the rows to line up.
  const lock = (node: React.ReactNode, span = "lg:col-span-1") => (
    <LockOverlay locked={!lcUnlocked} pending={lcPending} onUnlock={() => setLinkOpen(true)} className={span}>
      {node}
    </LockOverlay>
  );
  const [modal, setModal] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [cal, setCal] = useState<Month>(CAL_START);
  const [friendView, setFriendView] = useState<Friend | null>(null);
  const [friendProblem, setFriendProblem] = useState<ProblemRef | null>(null);
  const [myProblem, setMyProblem] = useState<ProblemRef | null>(null);
  const [myProblemRecent, setMyProblemRecent] = useState(false);
  const [myProblemLabel, setMyProblemLabel] = useState<string | undefined>(undefined);
  const [friendSol, setFriendSol] = useState<{ friend: Friend; problem: ProblemRef; recent: boolean } | null>(null);
  const [changeUsername, setChangeUsername] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [roadmap, setRoadmap] = useState<ProblemList>("neetcode150");
  // The board shared by My Progress + the Leaderboard card: a roadmap, or the
  // System Design / AI System Design rankings. Picking it on the left switches
  // the right leaderboard too.
  const [board, setBoard] = useState<ProblemList | "sd" | "genai">("neetcode150");
  const onBoard = (b: ProblemList | "sd" | "genai") => {
    setBoard(b);
    if (b !== "sd" && b !== "genai") setRoadmap(b);
  };
  const [sdSlug, setSdSlug] = useState<string | null>(null);
  const [sdComponents, setSdComponents] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [networkingOpen, setNetworkingOpen] = useState(false);
  // Admin-only: warn when the LeetCode session token is near/at expiry.
  const [sessionExpiry, setSessionExpiry] = useState<string>("");
  useEffect(() => {
    if (isAdmin) api.adminLeetcodeSession(getToken).then((s) => setSessionExpiry(s.expiresAt)).catch(() => {});
  }, [isAdmin, getToken]);
  const expiryDays = daysUntil(sessionExpiry);
  const showExpiryAlert = isAdmin && expiryDays !== null && expiryDays <= 7;
  const hello = greeting(new Date());

  // Apply the effective theme (auto = day/night by the local clock) + status-bar color.
  useEffect(() => {
    const apply = () => {
      const dark = effectiveDark(theme);
      document.documentElement.classList.toggle("dark", dark);
      document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = dark ? "#0a1826" : "#aed8f1";
      document.head.appendChild(meta);
    };
    apply();
    if (theme === "auto") {
      // Re-evaluate as time passes (and when the tab regains focus) so it flips
      // at the day/night boundary without a reload.
      const id = setInterval(apply, 60000);
      const onActive = () => apply();
      document.addEventListener("visibilitychange", onActive);
      window.addEventListener("focus", onActive);
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", onActive);
        window.removeEventListener("focus", onActive);
      };
    }
  }, [theme]);

  const openCalendar = () => {
    setCal(CAL_START);
    setModal("calendar");
  };

  const changeTheme = (next: ThemeMode) => {
    setTheme(next);
    api.setTheme(getToken, next).catch(() => {});
  };

  return (
    <div className="relative min-h-screen px-6 py-8 md:px-10 md:py-10">
      <Clouds />

      <div className="relative mx-auto max-w-[1400px] space-y-8">
        <TopBar
          name={userName}
          initials={initialsOf(userName)}
          theme={theme}
          onChangeTheme={changeTheme}
          onChangeUsername={() => setChangeUsername(true)}
          isAdmin={isAdmin}
          onAdmin={() => setAdminOpen(true)}
        />
        <Greeting hello={hello} name={userName.split(" ")[0]} />

        {showExpiryAlert && (
          <button
            onClick={() => setAdminOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-coral/50 bg-coral/10 px-4 py-3 text-left text-sm transition hover:bg-coral/15"
          >
            <span className="font-medium text-coral">
              {expiryDays! < 0 ? "LeetCode session expired" : `LeetCode session expires in ${expiryDays} day${expiryDays === 1 ? "" : "s"}`}
            </span>
            <span className="text-muted-foreground">
              {expiryDays! < 0 ? "Sync is paused until you replace the token." : "Replace it soon to keep syncing."}
            </span>
            <span className="ml-auto shrink-0 font-medium text-coral">Update →</span>
          </button>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {lock(<MyProgressCard onOpen={() => setModal("me")} board={board} onBoard={onBoard} />)}
          {lock(<LeaderboardCard onOpen={() => setModal("leaderboard")} board={board} roadmap={roadmap} />, "lg:col-span-2")}
          {lock(<MyFriendsCard onOpen={() => setModal("friends")} />)}
          {lock(<CurrentStreakCard onOpen={openCalendar} />)}
          {lock(<RecentActivityCard onOpen={() => setModal("recent")} onOpenModule={setSdSlug} userName={userName} />)}
          <SystemDesignCard onOpen={setSdSlug} onOpenComponents={() => setSdComponents(true)} />
          <GenAICard onOpen={setSdSlug} />
          <CloudCard onOpen={() => setCloudOpen(true)} />
          <NetworkingCard onOpen={() => setNetworkingOpen(true)} />
          <JobAlertsCard onOpen={() => setModal("jobs")} />
        </div>
      </div>

      {modal === "me" && (
        <ProgressModal
          onClose={() => setModal(null)}
          onOpenProblem={(p) => { setMyProblemRecent(false); setMyProblemLabel(undefined); setMyProblem(p); }}
        />
      )}
      {linkOpen && token && (
        <LinkLeetCodeModal
          token={token}
          onClose={() => setLinkOpen(false)}
          onLinked={() => onReloadMe?.()}
        />
      )}
      {changeUsername && <ChangeUsernameModal onClose={() => setChangeUsername(false)} isAdmin={isAdmin} />}
      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
      {(() => {
        // Guard the lookup: a stale slug (e.g. an old activity row for a renamed
        // module) must not crash the app - just don't open anything.
        if (!sdSlug) return null;
        const sdProblem = [...SD_PROBLEMS, ...GENAI_PROBLEMS].find((p) => p.slug === sdSlug);
        if (!sdProblem) return null;
        return (
          <ErrorBoundary label="System Design module" onReset={() => setSdSlug(null)}>
            {/* Key by slug so opening a different module remounts the modal with
                fresh canvas state - reused state from another module's palette
                used to crash the renderer. */}
            <SystemDesignModal key={sdProblem.slug} problem={sdProblem} onClose={() => setSdSlug(null)} />
          </ErrorBoundary>
        );
      })()}
      {sdComponents && <ComponentsModal onClose={() => setSdComponents(false)} />}
      {cloudOpen && <CloudModal onClose={() => setCloudOpen(false)} />}
      {networkingOpen && <NetworkingModal onClose={() => setNetworkingOpen(false)} />}
      {modal === "calendar" && (
        <CalendarModal
          cal={cal}
          setCal={setCal}
          onClose={() => setModal(null)}
          userName={userName}
          onOpenProblem={(p) => { setMyProblemRecent(true); setMyProblemLabel("Solutions"); setMyProblem(p); }}
          onOpenFriendProblem={(friend, problem) => setFriendSol({ friend, problem, recent: true })}
        />
      )}
      {modal === "leaderboard" && <LeaderboardModal onClose={() => setModal(null)} roadmap={roadmap} setRoadmap={setRoadmap} userName={userName} />}
      {modal === "recent" && (
        <RecentActivityModal
          onClose={() => setModal(null)}
          userName={userName}
          onOpenProblem={(p) => { setMyProblemRecent(true); setMyProblemLabel(undefined); setMyProblem(p); }}
          onOpenFriendProblem={(friend, problem) => setFriendSol({ friend, problem, recent: true })}
        />
      )}

      {modal === "friends" && (
        <FriendsModal
          onClose={() => setModal(null)}
          onOpenFriend={(f) => {
            setModal(null);
            setFriendView(f);
          }}
        />
      )}

      {friendView && (
        <FriendProgressModal
          friend={friendView}
          onBack={() => {
            setFriendView(null);
            setModal("friends");
          }}
          onClose={() => {
            setFriendView(null);
            setFriendProblem(null);
            setModal(null);
          }}
          onOpenProblem={(p) => setFriendProblem(p)}
          onRemove={() => {
            const removed = friendView;
            setFriendView(null);
            removeFriend(removed.id);
            setModal("friends");
          }}
        />
      )}

      {friendView && friendProblem && (
        <FriendSolutionModal
          friend={friendView}
          problem={friendProblem}
          onBack={() => setFriendProblem(null)}
          onClose={() => {
            setFriendProblem(null);
            setFriendView(null);
            setModal(null);
          }}
        />
      )}

      {myProblem && (
        <MySolutionModal
          problem={myProblem}
          recent={myProblemRecent}
          label={myProblemLabel}
          onBack={() => setMyProblem(null)}
          onClose={() => {
            setMyProblem(null);
            setModal(null);
          }}
        />
      )}

      {friendSol && (
        <FriendSolutionModal
          friend={friendSol.friend}
          problem={friendSol.problem}
          recent={friendSol.recent}
          onBack={() => setFriendSol(null)}
          onClose={() => {
            setFriendSol(null);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
