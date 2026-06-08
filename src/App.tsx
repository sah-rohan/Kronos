import { useEffect, useState } from "react";
import { greeting } from "./lib/greeting";
import { initialsOf } from "./lib/avatar";
import { CAL_START } from "./data/calendar";
import { useData } from "./data/source";
import { api } from "./lib/api";
import type { Friend, Month, ProblemRef } from "./types";
import { Clouds } from "./components/Clouds";
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

function App({ isAdmin = false, userName = "Jordan Dev", initialDark = false }: { isAdmin?: boolean; userName?: string; initialDark?: boolean }) {
  const { removeFriend, getToken } = useData();
  const [modal, setModal] = useState<string | null>(null);
  const [dark, setDark] = useState(initialDark);
  const [cal, setCal] = useState<Month>(CAL_START);
  const [friendView, setFriendView] = useState<Friend | null>(null);
  const [friendProblem, setFriendProblem] = useState<ProblemRef | null>(null);
  const [myProblem, setMyProblem] = useState<ProblemRef | null>(null);
  const [myProblemRecent, setMyProblemRecent] = useState(false);
  const [changeUsername, setChangeUsername] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const hello = greeting(new Date());

  useEffect(() => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = dark ? "#0a1826" : "#aed8f1";
    document.head.appendChild(meta);
  }, [dark]);

  const openCalendar = () => {
    setCal(CAL_START);
    setModal("calendar");
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    api.setTheme(getToken, next ? "dark" : "light").catch(() => {});
  };

  return (
    <div className="relative min-h-screen px-6 py-8 md:px-10 md:py-10">
      <Clouds />

      <div className="relative mx-auto max-w-[1400px] space-y-8">
        <TopBar
          name={userName}
          initials={initialsOf(userName)}
          dark={dark}
          onToggleDark={toggleDark}
          onChangeUsername={() => setChangeUsername(true)}
          isAdmin={isAdmin}
          onAdmin={() => setAdminOpen(true)}
        />
        <Greeting hello={hello} name={userName.split(" ")[0]} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <MyProgressCard onOpen={() => setModal("me")} />
          <LeaderboardCard onOpen={() => setModal("leaderboard")} />
          <MyFriendsCard onOpen={() => setModal("friends")} />
          <CurrentStreakCard onOpen={openCalendar} />
          <RecentActivityCard onOpen={() => setModal("recent")} userName={userName} />
        </div>
      </div>

      {modal === "me" && (
        <ProgressModal
          onClose={() => setModal(null)}
          onOpenProblem={(p) => { setMyProblemRecent(false); setMyProblem(p); }}
        />
      )}
      {changeUsername && <ChangeUsernameModal onClose={() => setChangeUsername(false)} isAdmin={isAdmin} />}
      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
      {modal === "calendar" && <CalendarModal cal={cal} setCal={setCal} onClose={() => setModal(null)} />}
      {modal === "leaderboard" && <LeaderboardModal onClose={() => setModal(null)} />}
      {modal === "recent" && (
        <RecentActivityModal
          onClose={() => setModal(null)}
          userName={userName}
          onOpenProblem={(p) => { setMyProblemRecent(true); setMyProblem(p); }}
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
          onBack={() => setMyProblem(null)}
          onClose={() => {
            setMyProblem(null);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
