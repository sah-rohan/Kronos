export function Greeting({ hello }: { hello: string }) {
  return (
    <header className="px-2 pb-2 pt-4 text-center md:pt-6">
      <h1 className="font-display text-[52px] leading-[1.02] tracking-tight text-foreground md:text-[64px]">
        {hello}, Jordan<span className="text-coral">.</span>
      </h1>
    </header>
  );
}
