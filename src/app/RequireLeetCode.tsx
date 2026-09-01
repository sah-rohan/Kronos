/**
 * Route guard for the LeetCode-backed screens.
 *
 * Phase 0 finding: `LockOverlay` only blurs locked cards and disables pointer
 * events on them. That was sufficient when the dashboard was the only screen,
 * because there was no other way in. The moment those screens have URLs, anyone
 * can type `/progress/neetcode150` and walk straight past the visual lock — so
 * the lock has to become a property of the route, not of the card.
 *
 * Redirects to the dashboard rather than to a "link your account" screen: the
 * dashboard already shows the locked cards with the unlock prompt, and the
 * unlock flow needs a Clerk token that the no-auth branch does not have.
 *
 * In the no-auth branch `lcUnlocked` defaults to true, so this is a passthrough
 * and both branches navigate identically.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { paths } from "../lib/slugs";
import { useShell } from "./shell";

export function RequireLeetCode() {
  const { lcUnlocked } = useShell();
  const location = useLocation();

  if (!lcUnlocked) {
    // `replace` so the blocked URL does not sit in history and re-trigger the
    // redirect on every back press. `state` records where they were headed, so
    // the dashboard can explain why they landed there.
    return (
      <Navigate
        to={paths.dashboard()}
        replace
        state={{ lockedFrom: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
