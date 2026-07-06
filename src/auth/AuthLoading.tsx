import { useEffect, useState } from "react";
import { LoadingScreen } from "../components/LoadingScreen";

// Shown while Clerk initializes. If init hangs (blocked cookies/storage, ad
// blocker, flaky network), swap the spinner for an actionable message instead
// of leaving the user on a blank or endless-loading screen.
export function AuthLoading() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(id);
  }, []);

  if (!slow) return <LoadingScreen message="Loading…" />;

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-8 text-center">
        <div className="font-display text-xl">Taking longer than usual</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign-in is having trouble starting. This usually means cookies are blocked (private browsing or strict
          privacy settings), an ad blocker is interfering, or the connection is slow.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
