// The route table. A data router, because route-level lazy(), errorElement, useNavigation() and
// <ScrollRestoration /> only exist there. Nesting: AuthBoundary > RequireSession > AppShell > routes.
// The literals here are the definitions that `paths` in lib/slugs.ts points at; everywhere else imports it.
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
    HydrateFallback: LoadingScreen,
    children: [
      {
        element: <RequireSession />,
        children: [
          {
            element: <AppShell />,
            // a thrown fetch renders the error card inside the shell chrome instead of white-screening.
            errorElement: <RouteError />,
            children: [
              // The dashboard is the landing route and is deliberately NOT lazy
              { index: true, element: <Dashboard /> },

              /* ---- LeetCode-backed routes ------------------------------- */
              {
                element: <RequireLeetCode />,
                children: [
                  {
                    path: "progress",
                    // Bare /progress is not a screen; it canonicalizes to a track so every tracker URL has the same shape.
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

              // These stay reachable for a Google-only sign-in
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
