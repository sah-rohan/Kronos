import { useEffect, useState } from "react";
import { greeting } from "./lib/greeting";
import { initialsOf } from "./lib/avatar";
import { CAL_START } from "./data/calendar";
import { useData } from "./data/source";
import { api } from "./lib/api";
import { effectiveDark } from "./lib/theme";
import type { Friend, Month, ProblemRef, ProblemList } from "./types";
import { Clouds } from "./components/Clouds";
import { SystemDesignCard } from "./systemdesign/SystemDesignCard";
import { SystemDesignModal } from "./systemdesign/SystemDesignModal";
import { ComponentsModal } from "./systemdesign/ComponentsModal";
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

type ThemeMode = "auto" | "light" | "dark";

function App({ isAdmin = false, userName = "Jordan Dev", initialTheme = "auto" }: { isAdmin?: boolean; userName?: string; initialTheme?: ThemeMode }) {
  const { removeFriend, getToken } = useData();
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
  const [sdSlug, setSdSlug] = useState<string | null>(null);
  const [sdComponents, setSdComponents] = useState(false);
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <MyProgressCard onOpen={() => setModal("me")} roadmap={roadmap} onRoadmap={setRoadmap} />
          <LeaderboardCard onOpen={() => setModal("leaderboard")} roadmap={roadmap} />
          <MyFriendsCard onOpen={() => setModal("friends")} />
          <CurrentStreakCard onOpen={openCalendar} />
          <RecentActivityCard onOpen={() => setModal("recent")} userName={userName} />
          <SystemDesignCard onOpen={setSdSlug} onOpenComponents={() => setSdComponents(true)} />
        </div>
      </div>

      {modal === "me" && (
        <ProgressModal
          onClose={() => setModal(null)}
          onOpenProblem={(p) => { setMyProblemRecent(false); setMyProblemLabel(undefined); setMyProblem(p); }}
        />
      )}
      {changeUsername && <ChangeUsernameModal onClose={() => setChangeUsername(false)} isAdmin={isAdmin} />}
      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
      {sdSlug && (
        <SystemDesignModal
          problem={SD_PROBLEMS.find((p) => p.slug === sdSlug)!}
          onClose={() => setSdSlug(null)}
        />
      )}
      {sdComponents && <ComponentsModal onClose={() => setSdComponents(false)} />}
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
