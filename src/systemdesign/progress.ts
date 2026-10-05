import { useEffect, useState } from "react";
import { api, type TokenFn } from "../lib/api";

// System Design completion is stored locally for now (standalone feature).
const KEY = "kronos.sd.completed";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function isCompleted(slug: string): boolean {
  return read().includes(slug);
}

export function completedSet(): Set<string> {
  return new Set(read());
}

export function completedCount(): number {
  return read().length;
}

export function markCompleted(slug: string): void {
  const cur = read();
  if (!cur.includes(slug)) localStorage.setItem(KEY, JSON.stringify([...cur, slug]));
}

export function useSdSolved(getToken: TokenFn): Set<string> {
  const [solved, setSolved] = useState<Set<string>>(() => completedSet());
  useEffect(() => {
    api.sdSolved(getToken).then((s) => setSolved(new Set([...completedSet(), ...(s ?? [])]))).catch(() => {});
  }, [getToken]);
  return solved;
}

export type LastPosition = { slug: string; slide: number; total: number; title: string };
const LAST_KEY = "kronos.sd.last";

export function readLastPosition(): LastPosition | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function saveLastPosition(p: LastPosition): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}
