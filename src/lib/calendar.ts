// Local-time date helpers — the one source of "what day is it".
// Never toISOString(): it is UTC, and silently shifts the day for anyone west of Greenwich.
import { useEffect, useState } from "react";

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function keyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type GridCell = {
  day: number;
  key: string;
  weekdayIndex: number;
  isToday: boolean;
};

export function monthGridCells(
  year: number,
  month: number,
  today: string,
): GridCell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const key = dateKey(date);
    return {
      day: i + 1,
      key,
      weekdayIndex: date.getDay(),
      isToday: key === today,
    };
  });
}

export function streakKeys(
  byDate: Record<string, number>,
  today: string,
  seasonStart?: number,
): Set<string> {
  const keys = new Set<string>();
  const cursor = keyToLocalDate(today);
  if ((byDate[dateKey(cursor)] ?? 0) === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }
  const floor = seasonStart ? dateKey(new Date(seasonStart * 1000)) : "";
  while ((byDate[dateKey(cursor)] ?? 0) > 0 && dateKey(cursor) >= floor) {
    keys.add(dateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return keys;
}

export function streakLength(
  byDate: Record<string, number>,
  today: string,
  seasonStart?: number,
): number {
  return streakKeys(byDate, today, seasonStart).size;
}

export function useToday(): { date: Date; key: string } {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    const check = () => setKey((prev) => (prev === todayKey() ? prev : todayKey()));
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return { date: keyToLocalDate(key), key };
}

export type DayState = "today" | "streak" | "solved" | "empty";

export function dayState(
  key: string,
  today: string,
  count: number,
  streak: Set<string>,
): DayState {
  if (key === today) return "today";
  if (streak.has(key)) return "streak";
  if (count > 0) return "solved";
  return "empty";
}

export function formatDayLabel(key: string): string {
  return keyToLocalDate(key).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export type CalMonth = { year: number; month: number };

function monthOrdinal(m: CalMonth): number {
  return m.year * 12 + m.month;
}

export function monthOf(d: Date): CalMonth {
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function clampMonth(target: CalMonth, min: CalMonth, max: CalMonth): CalMonth {
  const t = monthOrdinal(target);
  if (t < monthOrdinal(min)) return min;
  if (t > monthOrdinal(max)) return max;
  return target;
}
