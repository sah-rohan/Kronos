/**
 * Session gate as a layout route, replacing the old `AuthGate` component.
 *
 * Everything that needs a signed-in user nests under this route, so protection
 * is a property of the route table rather than a conditional buried in the
 * component tree. In the no-auth branch it is a passthrough that supplies the
 * same context with default values, so routes below cannot tell the difference.
 *
 * Both branches produce the identical shape:
 *
 *   DataProvider -> ShellContext.Provider -> <Outlet />
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  SignedOut,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { CLERK_KEY, useClerk } from "../lib/env";
import { api, setDisplayName, setUserEmail, type MeResponse, type TokenFn } from "../lib/api";
import { effectiveDark } from "../lib/theme";
import { DataProvider } from "../data/source";
import { LoadingScreen } from "../components/LoadingScreen";
import { AuthLoading } from "../auth/AuthLoading";
import { SignInScreen } from "../auth/SignInScreen";
import { PendingScreen } from "../auth/PendingScreen";
import { DEFAULT_SHELL, ShellContext, type ShellValue } from "./shell";

/** Module-scope so the no-auth branch passes a stable function identity. */
const NO_TOKEN: TokenFn = async () => null;

export function RequireSession() {
  // Fixed at build time by whether VITE_CLERK_PUBLISHABLE_KEY was present.
  if (!useClerk || !CLERK_KEY) {
    return <PassthroughSession />;
  }
  return <ClerkSession />;
}

/**
 * No-auth branch. Mirrors what `main.tsx` used to render directly: a
 * DataProvider with a null token and `App`'s old prop defaults.
 */
function PassthroughSession() {
  return (
    <DataProvider getToken={NO_TOKEN}>
      <ShellContext.Provider value={DEFAULT_SHELL}>
        <Outlet />
      </ShellContext.Provider>
    </DataProvider>
  );
}

/** Clerk branch: the loading / signed-out / signed-in fork, unchanged in behavior. */
function ClerkSession() {
  return (
    <>
      <ClerkLoading>
        <AuthLoading />
      </ClerkLoading>
      <ClerkLoaded>
        <SignedOut>
          <SignInScreen />
        </SignedOut>
        <SignedIn>
          <ClerkSessionData />
        </SignedIn>
      </ClerkLoaded>
    </>
  );
}

/**
 * The former `AuthGate` body: fetch `/me`, then provide data + shell context.
 * Only ever rendered inside `<SignedIn>`, so Clerk's hooks are safe here.
 */
function ClerkSessionData() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const token: TokenFn = useCallback(() => getToken(), [getToken]);
  const [me, setMe] = useState<MeResponse | "loading" | "error">("loading");

  const clerkName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "";

  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const load = useCallback(() => {
    setDisplayName(clerkName);
    setUserEmail(clerkEmail);
    api
      .me(token)
      .then(setMe)
      .catch(() => setMe("error"));
  }, [token, clerkName, clerkEmail]);

  useEffect(load, [load]);

  useEffect(() => {
    if (me && typeof me === "object") {
      const mode = (me.theme as "auto" | "light" | "dark") || "auto";
      document.documentElement.classList.toggle("dark", effectiveDark(mode));
    }
  }, [me]);

  const resolved = typeof me === "object" ? me : null;

  // Memoized so a poll tick in DataProvider does not also churn this context.
  const shell = useMemo<ShellValue | null>(() => {
    if (!resolved) return null;
    return {
      isAdmin: resolved.role === "admin",
      userName: clerkName || resolved.username || "You",
      initialTheme: (resolved.theme as ShellValue["initialTheme"]) || "auto",
      // Everyone is a member automatically. The LeetCode-powered routes unlock
      // as soon as a LeetCode username is linked; until then a Google sign-in
      // still has full access to the System Design content.
      lcUnlocked: !!resolved.username,
      lcPending: false,
      token,
      reloadMe: load,
    };
  }, [resolved, clerkName, token, load]);

  if (me === "loading") {
    return <LoadingScreen message="Signing you in…" />;
  }
  if (me === "error" || !shell) {
    return <PendingScreen />;
  }

  return (
    <DataProvider getToken={token} seasonStart={resolved?.season}>
      <ShellContext.Provider value={shell}>
        <Outlet />
      </ShellContext.Provider>
    </DataProvider>
  );
}
