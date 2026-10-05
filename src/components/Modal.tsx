import type { ReactNode } from "react";
import { X, ChevronLeft } from "lucide-react";
import { useEscape } from "../lib/useEscape";

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border-strong text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}

export function Modal({
  title,
  eyebrow,
  onClose,
  onBack,
  children,
  footer,
  fitContent = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  fitContent?: boolean;
}) {
  useEscape(onClose);
  const panel = fitContent
    ? "relative m-auto flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border"
    : "absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-border shadow-[-30px_0_80px_-40px_rgba(26,25,21,0.5)]";

  return (
    <div className={`fixed inset-0 z-50 ${fitContent ? "flex p-4" : ""}`}>
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-label={title} className={`modal-surface ${panel}`}>
        <header className="flex items-start gap-3 px-6 pb-2 pt-6 sm:px-8 sm:pt-7">
          {onBack && (
            <IconButton label="Back" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h1 className="m-0 font-display text-[32px] font-light leading-[1.05] tracking-[-0.015em] sm:text-[40px]">{title}</h1>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="modal-scroll flex-1 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-8">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}
