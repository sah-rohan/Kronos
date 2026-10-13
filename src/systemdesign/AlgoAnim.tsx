import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

// Animated algorithm visuals the tutor can drive: an array of boxes with
// moving pointers/windows, stepped automatically or by hand. Deterministic
// (computed from the input, never AI-drawn), so it is always correct.

export const ALGO_IDS = ["two_pointer", "sliding_window", "binary_search"] as const;
export type AlgoID = (typeof ALGO_IDS)[number];

type Frame = {
  // Highlighted index ranges: pointer positions and (optionally) a window.
  a: number;
  b: number;
  window?: boolean;
  note: string;
  done?: boolean;
};

// Build the frame list for each algorithm. Small, pure, and testable.
function frames(algo: AlgoID, input: number[], target: number): Frame[] {
  const out: Frame[] = [];
  if (input.length === 0) return out;

  if (algo === "two_pointer") {
    // Classic: sorted array, find a pair summing to target.
    const arr = [...input].sort((x, y) => x - y);
    let i = 0;
    let j = arr.length - 1;
    while (i < j) {
      const sum = arr[i] + arr[j];
      if (sum === target) {
        out.push({ a: i, b: j, note: `${arr[i]} + ${arr[j]} = ${target} - found the pair`, done: true });
        return out;
      }
      out.push({
        a: i,
        b: j,
        note: `${arr[i]} + ${arr[j]} = ${sum}, ${sum < target ? "too small - move left pointer right" : "too big - move right pointer left"}`,
      });
      if (sum < target) i++;
      else j--;
    }
    out.push({ a: i, b: j, note: "Pointers met - no pair sums to the target", done: true });
  }

  if (algo === "sliding_window") {
    // Longest window with sum <= target.
    let lo = 0;
    let sum = 0;
    let best = 0;
    for (let hi = 0; hi < input.length; hi++) {
      sum += input[hi];
      while (sum > target && lo <= hi) {
        out.push({ a: lo, b: hi, window: true, note: `Sum ${sum} > ${target} - shrink: drop ${input[lo]}` });
        sum -= input[lo];
        lo++;
      }
      best = Math.max(best, hi - lo + 1);
      out.push({ a: lo, b: hi, window: true, note: `Window sum ${sum} ≤ ${target}, length ${hi - lo + 1}` });
    }
    out.push({ a: lo, b: input.length - 1, window: true, note: `Done - longest valid window: ${best}`, done: true });
  }

  if (algo === "binary_search") {
    const arr = [...input].sort((x, y) => x - y);
    let lo = 0;
    let hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] === target) {
        out.push({ a: mid, b: mid, note: `arr[${mid}] = ${target} - found it`, done: true });
        return out;
      }
      out.push({
        a: lo,
        b: hi,
        window: true,
        note: `Middle arr[${mid}] = ${arr[mid]} ${arr[mid] < target ? "< target - search right half" : "> target - search left half"}`,
      });
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid - 1;
    }
    out.push({ a: 0, b: 0, note: "Range empty - target isn't in the array", done: true });
  }

  return out;
}

export function AlgoAnim({ algo, input, target }: { algo: string; input?: number[]; target?: number }) {
  const id = (ALGO_IDS as readonly string[]).includes(algo) ? (algo as AlgoID) : "two_pointer";
  const arr = useMemo(() => {
    const base = input && input.length >= 2 ? input.slice(0, 12) : [2, 7, 11, 15, 19, 23];
    return id === "sliding_window" ? base : [...base].sort((x, y) => x - y);
  }, [input, id]);
  const tgt = target ?? arr[0] + arr[arr.length - 1];
  const steps = useMemo(() => frames(id, arr, tgt), [id, arr, tgt]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setStep(0);
    setPlaying(true);
  }, [id, arr, tgt]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep((s) => {
        if (s >= steps.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1400);
    return () => clearInterval(t);
  }, [playing, steps.length]);

  const f = steps[Math.min(step, steps.length - 1)];
  if (!f) return null;
  const label = id === "two_pointer" ? "Two pointers" : id === "sliding_window" ? "Sliding window" : "Binary search";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label} · target {tgt}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
            aria-label="Restart"
            className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="grid h-7 w-7 place-items-center rounded-full bg-coral text-coral-foreground transition hover:opacity-95"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {arr.map((v, i) => {
          const inWindow = f.window && i >= f.a && i <= f.b;
          const isPointer = !f.window && (i === f.a || i === f.b);
          const hot = f.done && (i === f.a || i === f.b || inWindow);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-semibold tabular-nums transition-all duration-300 ${
                  hot
                    ? "border-[#3fae6a] bg-[#3fae6a]/15 text-[#3fae6a]"
                    : isPointer || inWindow
                      ? "border-coral bg-coral/10 text-foreground"
                      : "border-border text-muted-foreground"
                }`}
              >
                {v}
              </div>
              <div className="h-3 text-[10px] font-medium text-coral">
                {!f.window && i === f.a && i === f.b ? "↑" : !f.window && i === f.a ? "L" : !f.window && i === f.b ? "R" : ""}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        Step {Math.min(step + 1, steps.length)}/{steps.length}: {f.note}
      </p>
    </div>
  );
}
