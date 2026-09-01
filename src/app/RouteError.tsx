/**
 * The shared `errorElement`, hoisted to the shell layout route so a throw
 * anywhere below it renders here instead of white-screening the app.
 *
 * Two error shapes arrive here:
 *   - a `Response` thrown by a loader (`throw new Response(..., {status: 404})`),
 *     which `isRouteErrorResponse` narrows for us;
 *   - any other thrown value, i.e. a render-time crash or a rejected fetch.
 *
 * It deliberately renders its own full-page surface rather than assuming the
 * shell chrome is around it, because it is also used as the root route's
 * `errorElement`, where nothing above it has mounted.
 */
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { paths } from "../lib/slugs";

export function RouteError() {
  const error = useRouteError();

  const status = isRouteErrorResponse(error) ? error.status : null;
  const title =
    status === 404
      ? "Page not found"
      : status
        ? `Something went wrong (${status})`
        : "Something went wrong";
  const detail = isRouteErrorResponse(error)
    ? error.statusText || error.data
    : error instanceof Error
      ? error.message
      : null;

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
        <div className="font-display text-xl">{title}</div>
        {detail && (
          <p className="mt-2 break-words text-sm text-muted-foreground">{String(detail)}</p>
        )}
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            to={paths.dashboard()}
            className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
          >
            Back to dashboard
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
