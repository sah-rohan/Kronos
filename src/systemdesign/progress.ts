import { useEffect, useSyncExternalStore } from "react";
import { api, type TokenFn } from "../lib/api";
import { readJSON, write } from "../lib/storage";

// Completed modules: kept locally so they show instantly, merged with the
// server's list once it loads. One shared store, so every view stays in sync
// and the server is asked once rather than by each component.
const KEY = "kronos.sd.completed";

let solved = new Set<string>(readJSON<string[]>(KEY, []));
let fetched: TokenFn | null = null;
const listeners = new Set<() => void>();

function update(slugs: Iterable<string>) {
  solved = new Set([...solved, ...slugs]);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function markCompleted(slug: string): void {
  const local = readJSON<string[]>(KEY, []);
  if (!local.includes(slug)) write(KEY, JSON.stringify([...local, slug]));
  if (!solved.has(slug)) update([slug]);
}

export function useSdSolved(getToken: TokenFn): Set<string> {
  useEffect(() => {
    if (fetched === getToken) return;
    fetched = getToken;
    api.sdSolved(getToken).then((s) => update(s ?? [])).catch(() => {});
  }, [getToken]);
  return useSyncExternalStore(subscribe, () => solved);
}

export type LastPosition = { slug: string; slide: number; total: number; title: string };
const LAST_KEY = "kronos.sd.last";

export const readLastPosition = () => readJSON<LastPosition | null>(LAST_KEY, null);
export const saveLastPosition = (p: LastPosition) => write(LAST_KEY, JSON.stringify(p));
