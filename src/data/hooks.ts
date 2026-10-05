import { useEffect, useState } from "react";
import { api, type ApiSolution, type SdLeader } from "../lib/api";
import type { ModuleTrack } from "../systemdesign/catalog";
import type { Solution } from "../types";
import { useData } from "./context";

// Load once per change of `key`; `null` skips the request. Results that arrive
// after the key has moved on are dropped.
export function useFetch<T>(key: string | null, load: () => Promise<T>, fallback: T): T {
  const [state, setState] = useState<{ key: string | null; value: T }>({ key: null, value: fallback });
  useEffect(() => {
    if (key === null) return;
    let live = true;
    load()
      .then((value) => live && setState({ key, value: value ?? fallback }))
      .catch(() => live && setState({ key, value: fallback }));
    return () => {
      live = false;
    };
    // `load` and `fallback` are recreated each render; `key` captures what they depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.value;
}

// The design-module ranking for a track, or nothing while `track` is null.
export function useSdLeaderboard(track: ModuleTrack | null): SdLeader[] {
  const { getToken } = useData();
  return useFetch(track, () => api.sdLeaderboard(getToken, track === "genai" ? "genai" : "design"), [] as SdLeader[]);
}

const toSolutions = (rows: ApiSolution[]): Solution[] =>
  rows.map((r) => ({
    lang: r.lang,
    runtimeMs: r.runtimeMs,
    runtimePct: Math.round(r.runtimePct),
    optimal: r.optimal,
    code: r.code,
  }));

// Your solutions to a problem, or a friend's when `friendId` is given.
export function useSolutions(slug: string, recent: boolean, friendId?: string): Solution[] {
  const { getToken } = useData();
  return useFetch(
    `${friendId ?? "me"}/${slug}/${recent}`,
    () =>
      (friendId ? api.friendSolutions(getToken, friendId, slug, recent) : api.mySolutions(getToken, slug, recent)).then(
        (r) => toSolutions(r ?? []),
      ),
    [] as Solution[],
  );
}
