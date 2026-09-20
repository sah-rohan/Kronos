// Split out of source.tsx so that file exports only the DataProvider component — exporting a hook alongside it breaks Fast Refresh
import { createContext, useContext } from "react";
import type { TokenFn } from "../lib/api";
import type {
  CalendarProblem,
  Category,
  DifficultyTotal,
  Friend,
  Member,
  RecentItem,
} from "../types";

export type Calendar = {
  byDate: Record<string, number>;
  byDateProblems: Record<string, CalendarProblem[]>;
  streak: number;
};

export type Data = {
  loading: boolean;
  categories: Category[];
  solved: number;
  total: number;
  difficultyBars: {
    label: string;
    color: string;
    done: number;
    total: number;
  }[];
  members: Member[];
  recent: RecentItem[];
  friends: Friend[];
  friendsDifficulty: { label: string; val: number }[];
  groupTotals: DifficultyTotal[];
  calendar: Calendar;
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
