import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { initialsOf } from "./lib/avatar";
import { CAL_END } from "./lib/calendar";
import { useData } from "./data/context";
import { api, type TokenFn } from "./lib/api";
import { daysUntil } from "./lib/date";
import { plural } from "./lib/format";
import { isModuleBoard } from "./lib/roadmaps";
import { useApplyTheme, type ThemeMode } from "./lib/theme";
import { LockOverlay } from "./components/LockOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { moduleBySlug } from "./systemdesign/catalog";
import { Sidebar, MobileBar, AccountMenu, type NavItem } from "./sections/Sidebar";
import { HomeHeader } from "./sections/HomeHeader";
import { StatStrip } from "./sections/StatStrip";
import { StudyPage } from "./sections/StudyPage";
import { MyProgressCard } from "./sections/MyProgressCard";
import { LeaderboardCard } from "./sections/LeaderboardCard";
import { MyFriendsCard } from "./sections/MyFriendsCard";
import { CurrentStreakCard } from "./sections/CurrentStreakCard";
import { RecentActivityCard } from "./sections/RecentActivityCard";
import { LinkLeetCodeModal } from "./modals/LinkLeetCodeModal";
import { ProgressModal } from "./modals/ProgressModal";
import { CalendarModal } from "./modals/CalendarModal";
import { LeaderboardModal } from "./modals/LeaderboardModal";
import { RecentActivityModal } from "./modals/RecentActivityModal";
import { FriendsModal } from "./modals/FriendsModal";
import { FriendProgressModal } from "./modals/FriendProgressModal";
import { ChangeUsernameModal } from "./modals/ChangeUsernameModal";
import type { Board, Friend, Month, ProblemRef, ProblemList } from "./types";

// Heavier screens load on first open, keeping them (and the code highlighter)
// out of the initial bundle.
const SystemDesignModal = lazy(() => import("./systemdesign/SystemDesignModal").then((m) => ({ default: m.SystemDesignModal })));
const ComponentsModal = lazy(() => import("./systemdesign/ComponentsModal").then((m) => ({ default: m.ComponentsModal })));
const CloudModal = lazy(() => import("./systemdesign/CloudModal").then((m) => ({ default: m.CloudModal })));
const NetworkingModal = lazy(() => import("./systemdesign/NetworkingModal").then((m) => ({ default: m.NetworkingModal })));
const SolutionModal = lazy(() => import("./modals/SolutionModal").then((m) => ({ default: m.SolutionModal })));
const AdminModal = lazy(() => import("./modals/AdminModal").then((m) => ({ default: m.AdminModal })));

// Each lazy screen gets its own boundary so loading one never blanks another.
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

type Panel = "me" | "calendar" | "leaderboard" | "recent" | "friends";
type Page = "home" | "study";
// A solution being viewed: yours (with the panel's label), or a friend's.
type SolutionView = { problem: ProblemRef; recent: boolean; label?: string; friend?: Friend };

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
  const [page, setPage] = useState<Page>("home");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [cal, setCal] = useState<Month>(CAL_END);
  const [friendView, setFriendView] = useState<Friend | null>(null);
  const [friendProblem, setFriendProblem] = useState<ProblemRef | null>(null);
  const [solution, setSolution] = useState<SolutionView | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [changeUsername, setChangeUsername] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [sdSlug, setSdSlug] = useState<string | null>(null);
  const [sdComponents, setSdComponents] = useState(false);
  const [cloudTopic, setCloudTopic] = useState<string | null>(null);
  const [networkingTopic, setNetworkingTopic] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<ProblemList>("neetcode150");
  // The board shared by By difficulty + the Leaderboard card: a roadmap, or a
  // design-module ranking. Picking it on one switches the other too.
  const [board, setBoard] = useState<Board>("neetcode150");
  const onBoard = (b: Board) => {
    setBoard(b);
    if (!isModuleBoard(b)) setRoadmap(b);
  };

  // Admin-only: warn when the LeetCode session token is near/at expiry.
  const [sessionExpiry, setSessionExpiry] = useState("");
  useEffect(() => {
    if (isAdmin) api.adminLeetcodeSession(getToken).then((s) => setSessionExpiry(s.expiresAt)).catch(() => {});
  }, [isAdmin, getToken]);
  const expiryDays = daysUntil(sessionExpiry);

  useApplyTheme(theme);
  const changeTheme = (next: ThemeMode) => {
    setTheme(next);
    api.setTheme(getToken, next).catch(() => {});
  };

  const goTo = (next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0 });
  };
  const nav: NavItem[] = [
    { label: "Home", onClick: () => goTo("home"), active: page === "home" },
    { label: "Study", onClick: () => goTo("study"), active: page === "study" },
  ];
  const account = (compact: boolean) => (
    <AccountMenu
      name={userName}
      initials={initialsOf(userName)}
      theme={theme}
      onChangeTheme={changeTheme}
      onChangeUsername={() => setChangeUsername(true)}
      isAdmin={isAdmin}
      onAdmin={() => setAdminOpen(true)}
      placement={compact ? "down" : "up"}
      compact={compact}
    />
  );

  // When a card is locked, the LockOverlay wrapper becomes the grid item, so it
  // must carry the card's column span for the rows to line up.
  const lock = (node: ReactNode, span = "lg:col-span-1") => (
    <LockOverlay locked={!lcUnlocked} pending={lcPending} onUnlock={() => setLinkOpen(true)} className={span}>
      {node}
    </LockOverlay>
  );

  const closePanel = () => setPanel(null);
  const openFriendSolution = (friend: Friend, problem: ProblemRef) => setSolution({ friend, problem, recent: true });
  // A stale slug (e.g. an old activity row for a renamed module) opens nothing.
  const sdProblem = sdSlug ? moduleBySlug(sdSlug) : undefined;

  return (
    <div className="flex min-h-screen">
      <Sidebar items={nav} account={account(false)} />

      <div className="min-w-0 flex-1">
        <MobileBar items={nav} account={account(true)} />
        <main className="px-5 pb-[72px] pt-10 sm:px-[clamp(20px,5vw,72px)] sm:pt-12">
          {page === "home" ? (
            <div className="mx-auto flex max-w-[1080px] flex-col gap-12">
              <HomeHeader userName={userName} locked={!lcUnlocked} />
              <StatStrip userName={userName} roadmap={roadmap} locked={!lcUnlocked} />

              {isAdmin && expiryDays !== null && expiryDays <= 7 && (
                <button
                  onClick={() => setAdminOpen(true)}
                  className="-mt-6 flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-left text-sm transition-colors hover:bg-danger/10"
                >
                  <span className="font-medium text-danger">
                    {expiryDays < 0
                      ? "LeetCode session expired"
                      : `LeetCode session expires in ${expiryDays} ${plural(expiryDays, "day")}`}
                  </span>
                  <span className="text-muted-foreground">
                    {expiryDays < 0 ? "Sync is paused until you replace the token." : "Replace it soon to keep syncing."}
                  </span>
                  <span className="ml-auto shrink-0 font-medium text-danger">Update →</span>
                </button>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {lock(
                  <LeaderboardCard onOpen={() => setPanel("leaderboard")} board={board} roadmap={roadmap} userName={userName} />,
                  "lg:col-span-2",
                )}
                {lock(<MyProgressCard onOpen={() => setPanel("me")} board={board} onBoard={onBoard} />)}
                {lock(<RecentActivityCard onOpen={() => setPanel("recent")} onOpenModule={setSdSlug} userName={userName} />)}
                {lock(
                  <CurrentStreakCard
                    onOpen={() => {
                      setCal(CAL_END);
                      setPanel("calendar");
                    }}
                  />,
                )}
                {lock(<MyFriendsCard onOpen={() => setPanel("friends")} />)}
              </div>
            </div>
          ) : (
            <StudyPage
              onOpenModule={setSdSlug}
              onOpenComponents={() => setSdComponents(true)}
              onOpenCloud={setCloudTopic}
              onOpenNetworking={setNetworkingTopic}
            />
          )}
        </main>
      </div>

      {panel === "me" && (
        <ProgressModal onClose={closePanel} onOpenProblem={(problem) => setSolution({ problem, recent: false })} />
      )}
      {panel === "calendar" && (
        <CalendarModal
          cal={cal}
          setCal={setCal}
          onClose={closePanel}
          userName={userName}
          onOpenProblem={(problem) => setSolution({ problem, recent: true, label: "Solutions" })}
          onOpenFriendProblem={openFriendSolution}
        />
      )}
      {panel === "leaderboard" && (
        <LeaderboardModal onClose={closePanel} roadmap={roadmap} setRoadmap={setRoadmap} userName={userName} />
      )}
      {panel === "recent" && (
        <RecentActivityModal
          onClose={closePanel}
          userName={userName}
          onOpenProblem={(problem) => setSolution({ problem, recent: true })}
          onOpenFriendProblem={openFriendSolution}
        />
      )}
      {panel === "friends" && (
        <FriendsModal
          onClose={closePanel}
          onOpenFriend={(f) => {
            setPanel(null);
            setFriendView(f);
          }}
        />
      )}
      {friendView && (
        <FriendProgressModal
          friend={friendView}
          onBack={() => {
            setFriendView(null);
            setPanel("friends");
          }}
          onClose={() => {
            setFriendView(null);
            setFriendProblem(null);
            setPanel(null);
          }}
          onOpenProblem={setFriendProblem}
          onRemove={() => {
            setFriendView(null);
            removeFriend(friendView.id);
            setPanel("friends");
          }}
        />
      )}
      {linkOpen && token && (
        <LinkLeetCodeModal token={token} onClose={() => setLinkOpen(false)} onLinked={() => onReloadMe?.()} />
      )}
      {changeUsername && <ChangeUsernameModal onClose={() => setChangeUsername(false)} isAdmin={isAdmin} />}

      {friendView && friendProblem && (
        <Lazy>
          <SolutionModal
            friend={friendView}
            problem={friendProblem}
            onBack={() => setFriendProblem(null)}
            onClose={() => {
              setFriendProblem(null);
              setFriendView(null);
              setPanel(null);
            }}
          />
        </Lazy>
      )}
      {solution && (
        <Lazy>
          <SolutionModal
            {...solution}
            onBack={() => setSolution(null)}
            onClose={() => {
              setSolution(null);
              setPanel(null);
            }}
          />
        </Lazy>
      )}
      {adminOpen && (
        <Lazy>
          <AdminModal onClose={() => setAdminOpen(false)} />
        </Lazy>
      )}
      {sdProblem && (
        <ErrorBoundary label="System Design module" onReset={() => setSdSlug(null)}>
          <Lazy>
            {/* Key by slug so opening a different module remounts the modal with
                fresh canvas state - reused state from another module's palette
                used to crash the renderer. */}
            <SystemDesignModal key={sdProblem.slug} problem={sdProblem} onClose={() => setSdSlug(null)} />
          </Lazy>
        </ErrorBoundary>
      )}
      {sdComponents && (
        <Lazy>
          <ComponentsModal onClose={() => setSdComponents(false)} />
        </Lazy>
      )}
      {cloudTopic && (
        <Lazy>
          <CloudModal initialId={cloudTopic} onClose={() => setCloudTopic(null)} />
        </Lazy>
      )}
      {networkingTopic && (
        <Lazy>
          <NetworkingModal initialId={networkingTopic} onClose={() => setNetworkingTopic(null)} />
        </Lazy>
      )}
    </div>
  );
}

export default App;
