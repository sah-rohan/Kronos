import type { ReactNode } from "react";
import { X, ChevronLeft } from "lucide-react";

export function Modal({
  title,
  onClose,
  onBack,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-sky-foreground/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal-surface relative flex h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-border shadow-[0_30px_80px_-20px_rgba(7,55,129,0.55)]">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="absolute left-5 top-5 z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground backdrop-blur-md transition hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground backdrop-blur-md transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="modal-scroll flex-1 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-10">
          <div className={`font-display text-2xl tracking-tight sm:text-3xl ${onBack ? "px-12" : "pr-12"}`}>
            {title}
          </div>
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border bg-card/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
