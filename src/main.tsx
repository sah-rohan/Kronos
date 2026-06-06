import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import "./index.css";
import App from "./App";
import { CLERK_KEY, useClerk } from "./lib/env";
import { DataProvider } from "./data/source";
import { SignInScreen } from "./auth/SignInScreen";
import { AuthGate } from "./auth/AuthGate";

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    {useClerk && CLERK_KEY ? (
      <ClerkProvider publishableKey={CLERK_KEY}>
        <SignedOut>
          <SignInScreen />
        </SignedOut>
        <SignedIn>
          <AuthGate />
        </SignedIn>
      </ClerkProvider>
    ) : (
      <DataProvider getToken={async () => null}>
        <App />
      </DataProvider>
    )}
  </StrictMode>
);
