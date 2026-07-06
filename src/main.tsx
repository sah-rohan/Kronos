import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, ClerkLoading, ClerkLoaded, SignedIn, SignedOut } from "@clerk/clerk-react";
import "./index.css";
import App from "./App";
import { CLERK_KEY, useClerk } from "./lib/env";
import { DataProvider } from "./data/source";
import { SignInScreen } from "./auth/SignInScreen";
import { AuthGate } from "./auth/AuthGate";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthLoading } from "./auth/AuthLoading";

// A stale cached index.html can reference hashed bundles that no longer exist
// after a deploy; the failed chunk load left a blank page. Reload once (guarded
// so it can't loop) to pick up the fresh index.html.
window.addEventListener("vite:preloadError", (e) => {
  if (!sessionStorage.getItem("chunk-reloaded")) {
    sessionStorage.setItem("chunk-reloaded", "1");
    e.preventDefault();
    window.location.reload();
  }
});

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <ErrorBoundary>
      {useClerk && CLERK_KEY ? (
        <ClerkProvider publishableKey={CLERK_KEY}>
          <ClerkLoading>
            <AuthLoading />
          </ClerkLoading>
          <ClerkLoaded>
            <SignedOut>
              <SignInScreen />
            </SignedOut>
            <SignedIn>
              <AuthGate />
            </SignedIn>
          </ClerkLoaded>
        </ClerkProvider>
      ) : (
        <DataProvider getToken={async () => null}>
          <App />
        </DataProvider>
      )}
    </ErrorBoundary>
  </StrictMode>
);
