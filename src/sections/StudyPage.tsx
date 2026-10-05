import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useData } from "../data/source";
import { SD_PROBLEMS, type SDProblem } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import { CLOUD_DOCS } from "../systemdesign/cloud";
import { NETWORKING_DOCS } from "../systemdesign/networking";
import { readLastPosition, useSdSolved } from "../systemdesign/progress";

type Track = "sd" | "genai" | "cloud" | "networking";

const TRACKS: { key: Track; label: string }[] = [
  { key: "sd", label: "System Design" },
  { key: "genai", label: "AI System Design" },
  { key: "cloud", label: "Cloud" },
  { key: "networking", label: "Networking" },
];

const stepCount = (p: SDProblem) => p.slides.length + 1 + p.palette.length;
const num = (i: number) => String(i + 1).padStart(2, "0");

function Row({ index, title, sub, right, onClick }: { index: number; title: string; sub: string; right?: React.ReactNode; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group grid min-h-11 w-full grid-cols-[36px_1fr_auto] items-center gap-4 border-t border-border py-4 text-left sm:grid-cols-[44px_1fr_auto]"
      >
        <span className="font-mono text-[13px] text-muted-foreground">{num(index)}</span>
        <span className="min-w-0">
          <span className="block truncate text-base transition-colors group-hover:text-accent">{title}</span>
          <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>
        </span>
        {right}
      </button>
    </li>
  );
}

export function StudyPage({
  onOpenModule,
  onOpenComponents,
  onOpenCloud,
  onOpenNetworking,
}: {
  onOpenModule: (slug: string) => void;
  onOpenComponents: () => void;
  onOpenCloud: (id: string) => void;
  onOpenNetworking: (id: string) => void;
}) {
  const { getToken } = useData();
  const solved = useSdSolved(getToken);
  const [track, setTrack] = useState<Track>("sd");
  const last = readLastPosition();
  const all = [...SD_PROBLEMS, ...GENAI_PROBLEMS];
  const meta = TRACKS.find((t) => t.key === track)!;
  const modules = track === "genai" ? GENAI_PROBLEMS : SD_PROBLEMS;
  const resume = last && !solved.has(last.slug) ? all.find((p) => p.slug === last.slug) : undefined;
  const firstOpen = modules.find((p) => !solved.has(p.slug));

  const count = (t: Track) => {
    if (t === "cloud") return `${CLOUD_DOCS.length}`;
    if (t === "networking") return `${NETWORKING_DOCS.length}`;
    const list = t === "genai" ? GENAI_PROBLEMS : SD_PROBLEMS;
    return `${list.filter((p) => solved.has(p.slug)).length}/${list.length}`;
  };

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-10">
      <header className="flex flex-col gap-3.5">
        <h1 className="m-0 font-display text-[clamp(40px,5vw,60px)] font-light leading-[1.02] tracking-[-0.02em]">Study</h1>
      </header>

      <nav aria-label="Tracks" className="flex gap-7 overflow-x-auto border-b border-border">
        {TRACKS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTrack(t.key)}
            aria-current={t.key === track ? "page" : undefined}
            className={`-mb-px min-h-11 shrink-0 whitespace-nowrap border-b py-3 text-sm transition-colors ${
              t.key === track ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="font-mono text-xs text-muted-foreground">{count(t.key)}</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-[2]">
          <h2 className="m-0 mb-2 font-display text-[30px] font-normal">{meta.label}</h2>
          <ul className="m-0 list-none border-b border-border p-0">
            {(track === "sd" || track === "genai") &&
              modules.map((p, i) => {
                const complete = solved.has(p.slug);
                const active = !complete && last?.slug === p.slug;
                return (
                  <Row
                    key={p.slug}
                    index={i}
                    title={p.title}
                    sub={`${stepCount(p)} steps`}
                    onClick={() => onOpenModule(p.slug)}
                    right={
                      <span className="flex items-center gap-4 sm:gap-6">
                        <span className={`eyebrow hidden sm:inline ${p.difficulty === "Hard" ? "font-semibold text-hard" : "text-medium"}`}>
                          {p.difficulty}
                        </span>
                        <span className={`w-[84px] text-right text-[13px] ${complete ? "text-accent" : active ? "text-foreground" : "text-muted-foreground"}`}>
                          {complete ? "Complete" : active ? "In progress" : "Start"}
                        </span>
                      </span>
                    }
                  />
                );
              })}
            {track === "cloud" &&
              CLOUD_DOCS.map((d, i) => <Row key={d.id} index={i} title={d.name} sub={d.tagline} onClick={() => onOpenCloud(d.id)} />)}
            {track === "networking" &&
              NETWORKING_DOCS.map((d, i) => (
                <Row key={d.id} index={i} title={d.name} sub={d.tagline} onClick={() => onOpenNetworking(d.id)} />
              ))}
          </ul>
        </section>

        <aside className="flex flex-1 flex-col gap-6 lg:sticky lg:top-6">
          {(resume || firstOpen) && (
            <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-6">
              <span className="eyebrow">{resume ? "Continue" : "Start here"}</span>
              <span className="font-display text-2xl leading-tight">{(resume ?? firstOpen)!.title}</span>
              {resume && last ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    Step {last.slide + 1} of {last.total} · {last.title}
                  </span>
                  <span className="h-[3px] overflow-hidden rounded-sm bg-border">
                    <span className="block h-full bg-accent" style={{ width: `${((last.slide + 1) / last.total) * 100}%` }} />
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{stepCount(firstOpen!)} steps · {firstOpen!.difficulty}</span>
              )}
              <button
                type="button"
                onClick={() => onOpenModule((resume ?? firstOpen)!.slug)}
                className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-ink px-[18px] text-sm font-medium text-ink-foreground transition-opacity hover:opacity-90"
              >
                {resume ? "Resume" : "Begin"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onOpenComponents}
            className="flex flex-col gap-2 rounded-xl border border-border p-6 text-left transition-colors hover:border-border-strong"
          >
            <span className="eyebrow">Reference</span>
            <span className="font-display text-[22px]">Main components</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
