import type { CodingProgress, LiveMark } from "../lib/api";
import { MARK_LABEL } from "./labels";

const DOT: Record<LiveMark, string> = {
  strong: "bg-accent",
  solid: "bg-easy",
  weak: "border-2 border-danger",
  unseen: "border border-dashed border-muted-foreground/60",
};

export function MarkDot({ mark, size = "md" }: { mark: LiveMark; size?: "sm" | "md" }) {
  return <span className={`inline-block shrink-0 rounded-full ${size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} ${DOT[mark]}`} />;
}

export function MarkLegend() {
  return (
    <span aria-hidden className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {(["strong", "solid", "weak"] as LiveMark[]).map((m) => (
        <span key={m} className="flex items-center gap-1.5">
          <MarkDot mark={m} />
          {MARK_LABEL[m]}
        </span>
      ))}
    </span>
  );
}

export function ProgressTable({ progress }: { progress: CodingProgress }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse">
        <caption className="sr-only">Rubric marks across your recent coding interviews, oldest first</caption>
        <tbody>
          {progress.areas.map((a) => {
            const focus = a.area === progress.focus;
            return (
              <tr key={a.area} className="border-t border-border">
                <th scope="row" className={`w-[150px] py-3 pr-4 text-left text-sm ${focus ? "font-semibold text-danger" : "font-medium"}`}>
                  {a.area}
                </th>
                <td className="py-3">
                  <span role="img" aria-label={`${a.area}, oldest to newest: ${a.points.map((p) => p.mark).join(", ")}`} className="flex gap-2.5">
                    {a.points.map((p) => (
                      <span key={p.interviewId} title={`${p.title}: ${MARK_LABEL[p.mark]}`}>
                        <MarkDot mark={p.mark} />
                      </span>
                    ))}
                  </span>
                </td>
                <td className="py-3 text-right text-[13px] text-muted-foreground">{focus ? "focus area" : a.trend}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
