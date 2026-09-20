import { useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_KEY, useClerk } from "../lib/env";

export function AuthBoundary() {
  const navigate = useNavigate();

  const routerPush = useCallback(
    (to: string) => navigate(to),
    [navigate],
  );
  const routerReplace = useCallback(
    (to: string) => navigate(to, { replace: true }),
    [navigate],
  );

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
