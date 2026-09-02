// Session-derived facts the router's route elements need.
// Not a state-management layer: server data stays in DataProvider, view state lives in the URL.
import { createContext, useContext } from "react";
import type { TokenFn } from "../lib/api";

export type ThemeMode = "auto" | "light" | "dark";

export type ShellValue = {
  isAdmin: boolean;
  userName: string;
  initialTheme: ThemeMode;
  // False until a LeetCode username is linked
  lcUnlocked: boolean;
  lcPending: boolean;
  token?: TokenFn;
  // Re-fetches `/me` after the user links an account or changes their name.
  reloadMe: () => void;
};

export const DEFAULT_SHELL: ShellValue = {
  isAdmin: false,
  userName: "Jordan Dev",
  initialTheme: "auto",
  lcUnlocked: true,
  lcPending: false,
  token: undefined,
  reloadMe: () => {},
};

export const ShellContext = createContext<ShellValue>(DEFAULT_SHELL);

export function useShell(): ShellValue {
  return useContext(ShellContext);
}
