import { useData } from "../data/source";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import { CLOUD_DOCS } from "../systemdesign/cloud";
import { NETWORKING_DOCS } from "../systemdesign/networking";
import { useSdSolved } from "../systemdesign/progress";

export function StudyHeader() {
  const { getToken } = useData();
  const solved = useSdSolved(getToken);
  const modules = [...SD_PROBLEMS, ...GENAI_PROBLEMS];
  const done = modules.filter((p) => solved.has(p.slug)).length;

  return (
    <header className="flex flex-col gap-3.5">
      <span className="eyebrow">
        {done} of {modules.length} design modules complete · {CLOUD_DOCS.length + NETWORKING_DOCS.length} reference topics
      </span>
      <h1 className="m-0 font-display text-[clamp(40px,5vw,60px)] font-light leading-[1.02] tracking-[-0.02em]">Study</h1>
      <p className="m-0 max-w-xl text-base leading-relaxed text-muted-foreground">
        Pick a track and a topic. Design modules end with you building the system yourself.
      </p>
    </header>
  );
}
