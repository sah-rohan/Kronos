import { useEffect, useState } from "react";
import { api } from "./api";
import type { ApiSolution } from "./api";
import { useData } from "../data/source";
import type { Solution } from "../types";

function toSolutions(rows: ApiSolution[]): Solution[] {
  return rows.map((r) => ({
    lang: r.lang,
    runtimeMs: r.runtimeMs,
    runtimePct: Math.round(r.runtimePct),
    optimal: r.optimal,
    code: r.code,
  }));
}

export function useSolutions(fetcher: () => Promise<ApiSolution[]>): Solution[] {
  const [rows, setRows] = useState<Solution[]>([]);
  useEffect(() => {
    let active = true;
    fetcher()
      .then((r) => { if (active) setRows(toSolutions(r ?? [])); })
      .catch(() => { if (active) setRows([]); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rows;
}

export function useMySolutions(slug: string, recent = false): Solution[] {
  const { getToken } = useData();
  return useSolutions(() => api.mySolutions(getToken, slug, recent));
}

export function useFriendSolutions(friendId: string, slug: string): Solution[] {
  const { getToken } = useData();
  return useSolutions(() => api.friendSolutions(getToken, friendId, slug));
}
