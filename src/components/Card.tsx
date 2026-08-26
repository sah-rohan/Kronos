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
      className={`group rounded-[20px] bg-card border border-border p-6 shadow-[0_8px_30px_-12px_rgba(7,55,129,0.18)] backdrop-blur-md ${
        onClick
          ? "cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(7,55,129,0.28)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
