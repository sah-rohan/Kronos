import { Component, type ReactNode } from "react";

// Catches any render/lifecycle error below it so one crash can't blank the whole
// app. Shows a friendly fallback with a retry, and logs the stack so the real
// cause is visible in the console instead of a silent white screen.
export class ErrorBoundary extends Component<
  {
    children: ReactNode;
    // What to render on error. "reset" re-mounts the children; "reload" reloads
    // the page. label describes the crashed area in the fallback text.
    label?: string;
    hint?: string;
    onReset?: () => void;
  },
  { error: Error | null; attempt: number }
> {
  state = { error: null as Error | null, attempt: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Surface the real stack - these were previously invisible blank screens.
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  reset = () => {
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return <Subtree key={this.state.attempt}>{this.props.children}</Subtree>;
    return (
      <div className="grid min-h-[40vh] w-full place-items-center px-6 py-10">
        <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-8 text-center">
          <div className="font-display text-xl">Something went wrong</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.props.label ? `The ${this.props.label} hit an error.` : "The app hit an error."}{" "}
            {this.props.hint ?? "Try again, and if it keeps happening, reload the page."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              Reload
            </button>
          </div>
          {/* The message itself, collapsed. Reporting "it just breaks" was the
              only thing a user could previously do. */}
          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-muted-foreground">
              Error details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {this.state.error.message || String(this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

// Identity wrapper that exists purely to carry the remount key.
function Subtree({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
