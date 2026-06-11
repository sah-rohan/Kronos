import { useEffect, useState } from "react";

export type LeaderboardScope = "everyone" | "friends";

const SCOPE_KEY = "kronos.lb.scope";

function readScope(): LeaderboardScope {
  try {
    const raw = JSON.parse(localStorage.getItem(SCOPE_KEY) ?? '""');
    return raw === "friends" ? "friends" : "everyone";
  } catch {
    return "everyone";
  }
}

// Persisted leaderboard scope: Everyone or Friends only.
export function useLeaderboardScope() {
  const [scope, setScope] = useState<LeaderboardScope>(readScope);

  useEffect(() => {
    localStorage.setItem(SCOPE_KEY, JSON.stringify(scope));
  }, [scope]);

  return { scope, setScope };
}
