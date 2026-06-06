import { useState } from "react";
import { greeting } from "./lib/greeting";
import { CAL_START } from "./data/calendar";
import { useData } from "./data/source";
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

function App() {
  const { removeFriend } = useData();
  const [modal, setModal] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [cal, setCal] = useState<Month>(CAL_START);
  const [friendView, setFriendView] = useState<Friend | null>(null);
  const [friendProblem, setFriendProblem] = useState<ProblemRef | null>(null);
  const [myProblem, setMyProblem] = useState<ProblemRef | null>(null);
  const [changeUsername, setChangeUsername] = useState(false);
  const hello = greeting(new Date());

  const openCalendar = () => {
    setCal(CAL_START);
    setModal("calendar");
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="relative min-h-screen px-6 py-8 md:px-10 md:py-10">
      <Clouds />

      <div className="relative mx-auto max-w-[1400px] space-y-8">
        <TopBar dark={dark} onToggleDark={toggleDark} onChangeUsername={() => setChangeUsername(true)} />
        <Greeting hello={hello} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <MyProgressCard onOpen={() => setModal("me")} />
          <LeaderboardCard onOpen={() => setModal("leaderboard")} />
          <MyFriendsCard onOpen={() => setModal("friends")} />
          <CurrentStreakCard onOpen={openCalendar} />
          <RecentActivityCard onOpen={() => setModal("recent")} />
        </div>
      </div>

      {modal === "me" && (
        <ProgressModal onClose={() => setModal(null)} onOpenProblem={(p) => setMyProblem(p)} />
      )}
      {myProblem && <MySolutionModal problem={myProblem} onClose={() => setMyProblem(null)} />}
      {changeUsername && <ChangeUsernameModal onClose={() => setChangeUsername(false)} />}
      {modal === "calendar" && <CalendarModal cal={cal} setCal={setCal} onClose={() => setModal(null)} />}
      {modal === "leaderboard" && <LeaderboardModal onClose={() => setModal(null)} />}
      {modal === "recent" && <RecentActivityModal onClose={() => setModal(null)} />}

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
          onClose={() => {
            setFriendView(null);
            setModal("friends");
          }}
          onOpenProblem={(p) => setFriendProblem(p)}
          onRemove={() => {
            const removed = friendView;
            setFriendView(null);
            removeFriend(removed.username ?? removed.name);
            setModal("friends");
          }}
        />
      )}

      {friendView && friendProblem && (
        <FriendSolutionModal
          friend={friendView}
          problem={friendProblem}
          onClose={() => setFriendProblem(null)}
        />
      )}
    </div>
  );
}

export default App;
