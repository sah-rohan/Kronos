import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { paths } from "../lib/slugs";

export function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-coral">
          <Compass className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-3xl tracking-tight">Nothing here</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That link doesn&apos;t point at a page in Kronos. It may have been
          renamed, or the address may have a typo.
        </p>
        <Link
          to={paths.dashboard()}
          className="mt-6 inline-block rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
