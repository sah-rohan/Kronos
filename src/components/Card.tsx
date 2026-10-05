import type { MouseEvent, ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void; // MouseEvent lets callers inspect 'e.target' to see what was clicked
}) {
  return (
    <div
      onClick={onClick}
      className={`group rounded-xl border border-border bg-card p-6 sm:p-7 ${
        onClick ? "cursor-pointer transition-colors duration-200 hover:border-border-strong" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
