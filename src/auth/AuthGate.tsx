import { useCallback, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { api, setDisplayName, type MeResponse, type TokenFn } from "../lib/api";
import { DataProvider } from "../data/source";
import App from "../App";
import { LoadingScreen } from "../components/LoadingScreen";
import { PendingScreen } from "./PendingScreen";
import { OnboardingScreen } from "./OnboardingScreen";

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

  const load = useCallback(() => {
    setDisplayName(clerkName);
    api
      .me(token)
      .then(setMe)
      .catch(() => setMe("error"));
  }, [token, clerkName]);

  useEffect(load, [load]);

  useEffect(() => {
    if (me && typeof me === "object") {
      const mode = me.theme || "auto";
      const dark =
        mode === "dark" ||
        (mode === "auto" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    }
  }, [me]);

  if (me === "loading") {
    return <LoadingScreen message="Signing you in…" />;
  }
  if (me === "error") {
    return <PendingScreen />;
  }
  if (!me.username) {
    return <OnboardingScreen token={token} onDone={load} />;
  }
  if (me.status !== "approved") {
    return <PendingScreen />;
  }
  const name = clerkName || me.username || "You";
  return (
    <DataProvider getToken={token}>
      <App
        isAdmin={me.role === "admin"}
        userName={name}
        initialTheme={(me.theme as "auto" | "light" | "dark") || "auto"}
      />
    </DataProvider>
  );
}
