/**
 * The data context and its hook, split out from `source.tsx`.
 *
 * Why a separate file: `source.tsx` exports the `DataProvider` component, and
 * exporting a hook alongside it breaks Fast Refresh — which is what
 * `react-refresh/only-export-components` was flagging on `useData`. Keeping the
 * component in `source.tsx` and everything else here satisfies the rule and
 * means editing the provider no longer forces a full reload during development.
 *
 * Consumers import `useData` from here; only the router's session gate imports
 * `DataProvider` from `source.tsx`.
 */
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
