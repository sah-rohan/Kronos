import { useMemo } from "react";
import { EntryPoint } from "../components/EntryPoint";
import { DifficultyBars } from "../components/DifficultyBars";
import { useData } from "../data/context";
import { paths } from "../lib/slugs";
import {
  countSolvedByDifficulty,
  countsFromLabelled,
  subtractCounts,
  totalCounts,
} from "../lib/difficultyCounts";

export function MyFriendsCard() {
  const { friends, friendsDifficulty, categories } = useData();

  /**
   * The API exposes one combined series: `/me/circle` is "you + friends". There
   * is no friends-only endpoint, so the friends series is derived by subtracting
   * your own solves from the combined total, clamped at zero.
   *
   * Both operands are counted over the whole catalog so the subtraction is
   * comparable. Flagged in FOLLOWUPS.md (D-1): if the backend ever exposes a
   * friends-only breakdown, read it and delete this.
   */
  const { mine, friendsOnly } = useMemo(() => {
    const mineCounts = countSolvedByDifficulty(categories);
    const combined = countsFromLabelled(friendsDifficulty);
    return { mine: mineCounts, friendsOnly: subtractCounts(combined, mineCounts) };
  }, [categories, friendsDifficulty]);

  const hasFriends = friends.length > 0;

  return (
    <EntryPoint
      to={paths.friends()}
      action="Manage friends"
      ariaLabel={`Manage friends — ${friends.length} added`}
      className="h-full lg:col-span-1"
    >
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">My Friends</div>
        <span className="text-xs text-muted-foreground">{friends.length} added</span>
      </div>
      <div className="mb-5 mt-1 text-xs text-muted-foreground">
        Problems solved by difficulty
      </div>
      <DifficultyBars
        caption="Problems solved by difficulty, you compared with friends"
        series={[
          { id: "you", label: "You", counts: mine },
          { id: "friends", label: "Friends", counts: friendsOnly, hatched: true },
        ]}
        emptyNote={
          hasFriends
            ? undefined
            : totalCounts(mine) > 0
              ? "Add a friend to compare."
              : "Solve a problem to start your chart, then add a friend to compare."
        }
      />
    </EntryPoint>
  );
}
