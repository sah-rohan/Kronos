import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { api, type MeResponse, type TokenFn } from "../lib/api";
import { DataProvider } from "../data/source";
import App from "../App";
import { PendingScreen } from "./PendingScreen";
import { OnboardingScreen } from "./OnboardingScreen";

export function AuthGate() {
  const { getToken } = useAuth();
  const token: TokenFn = useCallback(() => getToken(), [getToken]);
  const [me, setMe] = useState<MeResponse | "loading" | "error">("loading");

  const load = useCallback(() => {
    api.me(token).then(setMe).catch(() => setMe("error"));
  }, [token]);

  useEffect(load, [load]);

  if (me === "loading") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (me === "error" || me.status !== "approved") {
    return <PendingScreen />;
  }
  if (!me.username) {
    return <OnboardingScreen token={token} onDone={load} />;
  }
  return (
    <DataProvider getToken={token}>
      <App isAdmin={me.role === "admin"} />
    </DataProvider>
  );
}
