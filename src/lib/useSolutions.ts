import { useEffect, useState } from "react";
import { useApi } from "./env";
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

export function useSolutions(fallback: Solution[], fetcher: () => Promise<ApiSolution[]>): Solution[] {
  const [rows, setRows] = useState<Solution[]>(useApi ? [] : fallback);
  useEffect(() => {
    if (!useApi) return;
    let active = true;
    fetcher()
      .then((r) => { if (active) setRows(toSolutions(r ?? [])); })
      .catch(() => { if (active) setRows([]); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rows;
}

export function useMySolutions(slug: string, fallback: Solution[], recent = false): Solution[] {
  const { getToken } = useData();
  return useSolutions(fallback, () => api.mySolutions(getToken, slug, recent));
}

export function useFriendSolutions(friendId: string, slug: string, fallback: Solution[]): Solution[] {
  const { getToken } = useData();
  return useSolutions(fallback, () => api.friendSolutions(getToken, friendId, slug));
}
