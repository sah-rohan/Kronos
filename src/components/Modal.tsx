import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  maxW = "max-w-4xl",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-sky-foreground/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`modal-surface relative max-h-[88vh] w-full ${maxW} overflow-hidden rounded-[24px] border border-border shadow-[0_30px_80px_-20px_rgba(7,55,129,0.55)]`}
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-10 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground backdrop-blur-md transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="modal-scroll max-h-[88vh] overflow-y-auto p-10">
          <div className="font-display text-3xl tracking-tight">{title}</div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
