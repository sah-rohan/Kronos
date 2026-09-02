import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  title,
  onClose,
  children,
  footer,
  labelledBy = "dialog-title",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();

    // Body scroll lock — the one piece <dialog> does not handle. Compensate for
    // the scrollbar's width so the page behind does not shift as it locks.
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      if (el.open) el.close();
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className="m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-sky-foreground/25 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-0 grid place-items-center p-3 sm:p-4">
        <div className="modal-surface relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-border shadow-[0_30px_80px_-20px_rgba(7,55,129,0.55)]">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground backdrop-blur-md transition hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="modal-scroll flex-1 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-10">
            <h2
              id={labelledBy}
              className="pr-12 font-display text-2xl tracking-tight sm:text-3xl"
            >
              {title}
            </h2>
            <div className="mt-6">{children}</div>
          </div>
          {footer && (
            <div className="shrink-0 border-t border-border bg-card/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-10">
              {footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
