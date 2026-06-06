export function Clouds() {
  const puff = "absolute rounded-full bg-white/70 blur-2xl";
  return (
    <div className="clouds pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
      <div className="absolute left-[6%] top-[60px] h-40 w-[360px] [animation:cloud-drift_22s_ease-in-out_infinite_alternate]">
        <div className={`${puff} left-0 top-6 h-24 w-48`} />
        <div className={`${puff} left-28 top-0 h-32 w-44`} />
        <div className={`${puff} left-52 top-8 h-24 w-40`} />
      </div>
      <div className="absolute right-[8%] top-[28px] h-32 w-[300px] [animation:cloud-drift_28s_ease-in-out_infinite_alternate-reverse]">
        <div className={`${puff} left-0 top-4 h-20 w-40`} />
        <div className={`${puff} left-24 top-0 h-24 w-40`} />
        <div className={`${puff} left-44 top-6 h-20 w-36`} />
      </div>
      <div className="absolute left-[42%] top-[150px] h-28 w-[280px] [animation:cloud-drift_34s_ease-in-out_infinite_alternate]">
        <div className={`${puff} left-0 top-4 h-16 w-36`} />
        <div className={`${puff} left-24 top-0 h-20 w-36`} />
      </div>
    </div>
  );
}
