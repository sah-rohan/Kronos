import { createContext, useContext } from "react";
import type { TokenFn } from "../lib/api";
import type { CalendarData } from "./transform";
import type { Category, DifficultyTotal, Friend, Member, RecentItem } from "../types";

export type Data = {
  categories: Category[];
  members: Member[];
  recent: RecentItem[];
  friends: Friend[];
  friendsDifficulty: { label: string; val: number }[];
  groupTotals: DifficultyTotal[];
  calendar: CalendarData & { streak: number };
  addFriend: (username: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  getToken: TokenFn;
};

export const DataContext = createContext<Data | null>(null);

export function useData(): Data {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
