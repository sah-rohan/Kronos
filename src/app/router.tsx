/**
 * The route table.
 *
 * Data router (`createBrowserRouter`), not `<BrowserRouter>` + `<Routes>`,
 * because Phase 1 needs four things that only the data router provides:
 * route-level `lazy()`, `errorElement` boundaries, `useNavigation()` for pending
 * UI, and `<ScrollRestoration />`.
 *
 * Nesting, outermost first:
 *
 *   AuthBoundary      ClerkProvider (wired to useNavigate) or passthrough
 *     RequireSession  session gate; provides DataProvider + shell context
 *       AppShell      persistent header/chrome, does not remount on navigation
 *         Dashboard   index
 *         RequireLeetCode   the routes that need a linked LeetCode account
 *         ...content routes (no LeetCode needed)
 *         NotFound    *
 *
 * Every path string comes from `paths` in lib/slugs.ts. The literals below are
 * the one exception — they are the definitions those helpers point at.
 */
import { createBrowserRouter, redirect } from "react-router-dom";
import { AuthBoundary } from "./AuthBoundary";
import { RequireSession } from "./RequireSession";
import { RequireLeetCode } from "./RequireLeetCode";
import { AppShell } from "./AppShell";
import { RouteError } from "./RouteError";
import { LoadingScreen } from "../components/LoadingScreen";
import { NotFound } from "./NotFound";
import { Dashboard } from "../pages/Dashboard";
import { DEFAULT_TRACK, paths } from "../lib/slugs";

export const router = createBrowserRouter([
  {
    element: <AuthBoundary />,
    // Catches anything thrown before the shell exists (session load, Clerk).
    errorElement: <RouteError />,
    // Shown while the first route's lazy chunk resolves. Without it the data
    // router warns ("No HydrateFallback element provided") and renders nothing
    // when someone cold-loads a deep link into a code-split route.
    HydrateFallback: LoadingScreen,
    children: [
      {
        element: <RequireSession />,
        children: [
          {
            element: <AppShell />,
            // Hoisted boundary: one errorElement covers every page below, so a
            // thrown fetch renders the error card inside the shell chrome
            // instead of white-screening.
            errorElement: <RouteError />,
            children: [
              // The dashboard is the landing route and is deliberately NOT
              // lazy — splitting the first screen only adds a round trip.
              { index: true, element: <Dashboard /> },

              /* ---- LeetCode-backed routes ------------------------------- */
              {
                element: <RequireLeetCode />,
                children: [
                  {
                    path: "progress",
                    // Bare /progress is not a screen; it canonicalizes to a
                    // track so every tracker URL has the same shape.
                    loader: () => redirect(paths.progress(DEFAULT_TRACK)),
                  },
                  {
                    path: "progress/:track",
                    lazy: async () => ({
                      Component: (await import("../pages/ProblemTracker")).ProblemTracker,
                    }),
                  },
                  {
                    path: "leaderboard",
                    lazy: async () => ({
                      Component: (await import("../pages/Leaderboard")).Leaderboard,
                    }),
                  },
                  {
                    path: "u/:handle",
                    lazy: async () => ({
                      Component: (await import("../pages/UserProfile")).UserProfile,
                    }),
                  },
                  {
                    path: "u/:handle/activity",
                    lazy: async () => ({
                      Component: (await import("../pages/UserActivity")).UserActivity,
                    }),
                  },
                  {
                    path: "activity",
                    lazy: async () => ({
                      Component: (await import("../pages/Activity")).Activity,
                    }),
                  },
                  {
                    path: "friends",
                    lazy: async () => ({
                      Component: (await import("../pages/Friends")).Friends,
                    }),
                  },
                ],
              },

              /* ---- Content routes: no LeetCode account required ---------- */
              // These stay reachable for a Google-only sign-in, which is the
              // whole reason the LeetCode lock is per-route rather than global.
              {
                path: "system-design",
                lazy: async () => ({
                  Component: (await import("../pages/SystemDesignIndex")).SystemDesignIndex,
                }),
              },
              {
                path: "system-design/:moduleSlug",
                lazy: async () => ({
                  Component: (await import("../pages/SystemDesignModule")).SystemDesignModule,
                }),
              },
              {
                path: "genai-system-design",
                lazy: async () => ({
                  Component: (await import("../pages/GenAIIndex")).GenAIIndex,
                }),
              },
              {
                path: "genai-system-design/:moduleSlug",
                lazy: async () => ({
                  Component: (await import("../pages/GenAIModule")).GenAIModule,
                }),
              },
              {
                path: "cloud",
                lazy: async () => ({
                  Component: (await import("../pages/CloudIndex")).CloudIndex,
                }),
              },
              {
                path: "cloud/:topicSlug",
                lazy: async () => ({
                  Component: (await import("../pages/CloudTopic")).CloudTopic,
                }),
              },
              {
                path: "networking",
                lazy: async () => ({
                  Component: (await import("../pages/NetworkingIndex")).NetworkingIndex,
                }),
              },
              {
                path: "networking/:topicSlug",
                lazy: async () => ({
                  Component: (await import("../pages/NetworkingTopic")).NetworkingTopic,
                }),
              },

              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
]);
