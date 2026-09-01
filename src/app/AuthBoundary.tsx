/**
 * The one place the Clerk-vs-no-auth branch is decided.
 *
 * Provider order, and why it is this way round:
 *
 *   RouterProvider              <- outermost, so hooks below can navigate
 *     AuthBoundary (this file)  <- ClerkProvider, or a passthrough
 *       RequireSession          <- session gate + data + shell context
 *         AppShell              <- persistent chrome
 *           ...routes
 *
 * `ClerkProvider` wants `routerPush` / `routerReplace` so that Clerk-initiated
 * navigation (post-sign-in redirect, `<UserButton>` links) is a client-side
 * navigation instead of a full document load. Those have to come from
 * `useNavigate`, and `useNavigate` only exists *inside* a router. That rules out
 * the obvious `<ClerkProvider><RouterProvider/></ClerkProvider>` shape and
 * forces Clerk to be a route element rather than a wrapper around the router.
 *
 * Both branches render `<Outlet />` and nothing else, so every route below sees
 * an identical tree shape whether or not Clerk is configured.
 */
import { useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_KEY, useClerk } from "../lib/env";

export function AuthBoundary() {
  const navigate = useNavigate();

  // Clerk's types require routerPush and routerReplace to be supplied together
  // or not at all, so both are always defined here.
  const routerPush = useCallback(
    (to: string) => navigate(to),
    [navigate],
  );
  const routerReplace = useCallback(
    (to: string) => navigate(to, { replace: true }),
    [navigate],
  );

  // `useClerk` here is the env boolean from lib/env, not Clerk's hook of the
  // same name. Both are module constants, so this branch is fixed at build time
  // and the hooks above always run in the same order.
  if (!useClerk || !CLERK_KEY) {
    return <Outlet />;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      routerPush={routerPush}
      routerReplace={routerReplace}
    >
      <Outlet />
    </ClerkProvider>
  );
}
