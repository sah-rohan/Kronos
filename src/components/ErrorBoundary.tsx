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
    onReset?: () => void;
  },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Surface the real stack - these were previously invisible blank screens.
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-[40vh] w-full place-items-center px-6 py-10">
        <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-8 text-center">
          <div className="font-display text-xl">Something went wrong</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.props.label ? `The ${this.props.label} hit an error.` : "The app hit an error."} Your progress is
            saved - try again, and if it keeps happening, reload the page.
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
        </div>
      </div>
    );
  }
}
