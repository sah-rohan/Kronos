import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./app/router";
import { ErrorBoundary } from "./components/ErrorBoundary";

/**
 * A stale cached index.html can reference hashed bundles that no longer exist
 * after a deploy; the failed chunk load left a blank page. Reload once (guarded
 * so it can't loop) to pick up the fresh index.html.
 *
 * This matters MORE now, not less: route-level lazy() means there are many more
 * chunks than there used to be, and any of them can 404 against a stale
 * index.html. It is also why the guard lives here at module scope rather than in
 * a component — it has to be listening before the first dynamic import resolves.
 */
window.addEventListener("vite:preloadError", (e) => {
  if (!sessionStorage.getItem("chunk-reloaded")) {
    sessionStorage.setItem("chunk-reloaded", "1");
    e.preventDefault();
    window.location.reload();
  }
});

const root = createRoot(document.getElementById("root")!);

/**
 * The router is the top of the tree. Everything that used to live here — the
 * Clerk conditional, the session gate, DataProvider — is now a route element,
 * because ClerkProvider needs `useNavigate` and that only exists inside a
 * router. See app/AuthBoundary.tsx for the full rationale.
 *
 * The outer ErrorBoundary stays as a last resort for a crash in the router
 * itself; per-route failures are handled by `errorElement`.
 */
root.render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
