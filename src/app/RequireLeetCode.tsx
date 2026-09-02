//Route guard for the LeetCode-backed screens.
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
