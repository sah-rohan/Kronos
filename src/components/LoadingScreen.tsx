import { Clouds } from "./Clouds";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-white/40 dark:bg-white/5 ${className}`} />;
}

export function LoadingScreen({ message = "Loading your progress…" }: { message?: string }) {
  return (
    <div className="relative min-h-screen px-6 py-8 md:px-10 md:py-10">
      <Clouds />
      <div className="relative mx-auto max-w-[1400px] space-y-8">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl tracking-tight">KRONOS</div>
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>

        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-coral" />
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-1" />
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
