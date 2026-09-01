/**
 * The app-shell context: the prop payload `App` used to receive from `AuthGate`.
 *
 * Why this exists: the router is created once at module scope, so route elements
 * cannot be handed props by the auth code the way `<App isAdmin={...} />` was.
 * Moving that exact payload into a context lets both auth branches render the
 * same router while still supplying their own values.
 *
 * This is NOT a state-management layer and must not grow into one. It carries
 * session-derived facts only. Server data stays in `DataProvider`; view state
 * lives in the URL.
 *
 * No JSX in this file on purpose: it exports a hook and a context but no
 * component, which keeps `react-refresh/only-export-components` quiet.
 */
import { createContext, useContext } from "react";
import type { TokenFn } from "../lib/api";

export type ThemeMode = "auto" | "light" | "dark";

export type ShellValue = {
  isAdmin: boolean;
  userName: string;
  /** Theme persisted on the user record; the shell owns the live value. */
  initialTheme: ThemeMode;
  /** False until a LeetCode username is linked — gates the LeetCode routes. */
  lcUnlocked: boolean;
  lcPending: boolean;
  /**
   * Clerk token getter. `undefined` in the no-auth branch, which is what the
   * "Link LeetCode" route keys off of — it cannot work without a real session.
   */
  token?: TokenFn;
  /** Re-fetches `/me` after the user links an account or changes their name. */
  reloadMe: () => void;
};

/** Matches the old `App` prop defaults so the no-auth branch behaves as before. */
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
