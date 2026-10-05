import { Clock } from "lucide-react";
import { SignOutButton } from "@clerk/clerk-react";

export function PendingScreen() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-10 text-center ">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-coral">
          <Clock className="h-5 w-5" />
        </div>
        <div className="font-display mt-5 text-2xl tracking-tight">Waiting for approval</div>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account is pending. An admin will let you in shortly to keep LeetCode
          usernames verified. Check back soon.
        </p>
        <div className="mt-6">
          <SignOutButton>
            <button className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
