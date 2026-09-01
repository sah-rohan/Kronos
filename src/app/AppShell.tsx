/**
 * The persistent app shell.
 *
 * This is a layout route, so the header / KRONOS mark / avatar menu mount once
 * and survive every navigation below them — no remount, no flash, no re-running
 * the theme effect on each screen change.
 *
 * It owns:
 *   - the drifting-clouds background and the theme (auto/light/dark) effect
 *   - `<TopBar />` and the two transient dialogs it opens
 *   - `<ScrollRestoration />`
 *   - the pending-navigation indicator
 *
 * It does not own page content. Everything else renders through `<Outlet />`.
 */
import { useEffect, useState } from "react";
import { Outlet, ScrollRestoration, useNavigation } from "react-router-dom";
import { Clouds } from "../components/Clouds";
import { TopBar } from "../sections/TopBar";
import { AdminDialog } from "../overlays/AdminDialog";
import { ChangeUsernameDialog } from "../overlays/ChangeUsernameDialog";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { effectiveDark } from "../lib/theme";
import { initialsOf } from "../lib/avatar";
import { useShell, type ThemeMode } from "./shell";

export function AppShell() {
  const { isAdmin, userName, initialTheme } = useShell();
  const { getToken } = useData();
  const navigation = useNavigation();

  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Apply the effective theme (auto = day/night by the local clock) plus the
  // status-bar color. Unchanged from the old App.tsx, just hoisted so it runs
  // once for the whole session rather than per screen.
  useEffect(() => {
    const apply = () => {
      const dark = effectiveDark(theme);
      document.documentElement.classList.toggle("dark", dark);
      document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = dark ? "#0a1826" : "#aed8f1";
      document.head.appendChild(meta);
    };
    apply();
    if (theme === "auto") {
      // Re-evaluate as time passes (and when the tab regains focus) so it flips
      // at the day/night boundary without a reload.
      const id = setInterval(apply, 60000);
      const onActive = () => apply();
      document.addEventListener("visibilitychange", onActive);
      window.addEventListener("focus", onActive);
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", onActive);
        window.removeEventListener("focus", onActive);
      };
    }
  }, [theme]);

  const changeTheme = (next: ThemeMode) => {
    setTheme(next);
    api.setTheme(getToken, next).catch(() => {});
  };

  return (
    <div className="relative min-h-screen px-6 py-8 md:px-10 md:py-10">
      <Clouds />

      {/*
        Pending-navigation indicator. A top-edge bar rather than a full-page
        spinner, so the screen you are leaving stays readable while the next
        route's chunk loads.
      */}
      <div
        aria-hidden={navigation.state !== "loading"}
        className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-coral transition-opacity duration-200 ${
          navigation.state === "loading"
            ? "animate-pulse opacity-100"
            : "opacity-0"
        }`}
      />

      <div className="relative mx-auto max-w-[1400px] space-y-8">
        <TopBar
          name={userName}
          initials={initialsOf(userName)}
          theme={theme}
          onChangeTheme={changeTheme}
          onChangeUsername={() => setChangeUsernameOpen(true)}
          isAdmin={isAdmin}
          onAdmin={() => setAdminOpen(true)}
        />

        <Outlet />
      </div>

      {changeUsernameOpen && (
        <ChangeUsernameDialog
          isAdmin={isAdmin}
          onClose={() => setChangeUsernameOpen(false)}
        />
      )}
      {adminOpen && <AdminDialog onClose={() => setAdminOpen(false)} />}

      {/*
        Restores scroll position per history entry. Without it, going back from a
        deep link lands you at the top of the dashboard instead of where you
        left off.
      */}
      <ScrollRestoration />
    </div>
  );
}
