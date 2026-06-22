import { useCallback, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { api, setDisplayName, setUserEmail, type MeResponse, type TokenFn } from "../lib/api";
import { effectiveDark } from "../lib/theme";
import { DataProvider } from "../data/source";
import App from "../App";
import { LoadingScreen } from "../components/LoadingScreen";
import { PendingScreen } from "./PendingScreen";

export function AuthGate() {
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

  if (me === "loading") {
    return <LoadingScreen message="Signing you in…" />;
  }
  if (me === "error") {
    return <PendingScreen />;
  }
  // Everyone is a member automatically. The LeetCode-powered features unlock as
  // soon as a LeetCode username is linked; until then a Google sign-in still has
  // full access to the System Design modules and the LeetCode cards stay locked.
  const lcUnlocked = !!me.username;
  const lcPending = false;
  const name = clerkName || me.username || "You";
  return (
    <DataProvider getToken={token} seasonStart={me.season}>
      <App
        isAdmin={me.role === "admin"}
        userName={name}
        initialTheme={(me.theme as "auto" | "light" | "dark") || "auto"}
        lcUnlocked={lcUnlocked}
        lcPending={lcPending}
        token={token}
        onReloadMe={load}
      />
    </DataProvider>
  );
}
