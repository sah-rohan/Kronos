import { useState } from "react";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(read(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, quota) */
  }
}

// A string choice remembered across visits. Unknown saved values fall back.
// `json` keeps the quoted format older builds wrote for some keys.
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[], fallback: T, json = false) {
  const [value, setValue] = useState<T>(() => {
    const raw = json ? readJSON<string>(key, "") : read(key);
    return allowed.includes(raw as T) ? (raw as T) : fallback;
  });
  const set = (next: T) => {
    setValue(next);
    write(key, json ? JSON.stringify(next) : next);
  };
  return [value, set] as const;
}
