import { SignIn } from "@clerk/clerk-react";

export function SignInScreen() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="font-display text-4xl tracking-tight text-foreground">
          Kronos<span className="text-coral">.</span>
        </div>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Sign in to track the NeetCode 150 with your group.
        </p>
        <SignIn />
      </div>
    </div>
  );
}
