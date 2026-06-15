import { useEffect, useState } from "react";
import { Compass, MoreHorizontal } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";
import { isInAppBrowser, mobileOS, openInDefaultBrowser } from "../lib/webview";

function OpenInBrowserNotice() {
  const [copied, setCopied] = useState(false);
  const os = mobileOS();

  // On Android, hand off to the default browser automatically (the way most
  // apps do). iOS can't be redirected programmatically, so we show the steps.
  useEffect(() => {
    if (os === "android") openInDefaultBrowser();
  }, [os]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText("https://usekronos.tech");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="max-w-md rounded-[24px] border border-border bg-card p-10 text-center shadow-[0_30px_80px_-20px_rgba(7,55,129,0.45)] backdrop-blur-md">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-coral">
        <Compass className="h-5 w-5" />
      </div>
      <div className="font-display mt-5 text-2xl tracking-tight">Open in your browser</div>
      <p className="mt-3 text-sm text-muted-foreground">
        Google sign-in doesn't work inside in-app browsers. Open Kronos in your browser and sign in
        there.
      </p>

      {os === "ios" ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm">
          <span>Tap</span>
          <MoreHorizontal className="h-4 w-4 shrink-0" />
          <span>at the top, then <b>Open in Safari</b></span>
        </div>
      ) : (
        <button
          onClick={() => openInDefaultBrowser()}
          className="mt-6 w-full rounded-full bg-coral px-4 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95"
        >
          Open in browser
        </button>
      )}

      <button
        onClick={copy}
        className="mt-3 text-xs font-medium text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
      >
        {copied ? "Link copied" : "or copy the link"}
      </button>
    </div>
  );
}

export function SignInScreen() {
  const inApp = isInAppBrowser();
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="font-display text-4xl tracking-tight text-foreground">
          Kronos<span className="text-coral">.</span>
        </div>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Sign in to track the NeetCode 150 with your group.
        </p>
        {inApp ? <OpenInBrowserNotice /> : <SignIn />}
      </div>
    </div>
  );
}
