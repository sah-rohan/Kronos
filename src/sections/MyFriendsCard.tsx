import { UserPlus } from "lucide-react";
import { Card } from "../components/Card";
import { CircleChart } from "../components/CircleChart";
import { useData } from "../data/source";

export function MyFriendsCard({ onOpen }: { onOpen: () => void }) {
  const { friends, friendsDifficulty } = useData();
  return (
    <Card className="lg:col-span-1" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">My Friends</div>
        <span className="text-xs text-muted-foreground">{friends.length} added</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Problems solved by difficulty, you + friends
      </div>
      <div className="mt-6">
        <CircleChart data={friendsDifficulty} />
      </div>
      <div className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-coral">
        <UserPlus className="h-4 w-4" /> Manage friends
      </div>
    </Card>
  );
}
