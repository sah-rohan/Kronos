function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export function LoadingScreen({ message = "Loading your progress…" }: { message?: string }) {
  return (
    <div className="min-h-screen px-5 py-10 md:px-16 md:py-12">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-10">
        <div className="flex flex-col gap-4">
          <div className="font-display text-2xl">Kronos</div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
            {message}
          </div>
        </div>
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
