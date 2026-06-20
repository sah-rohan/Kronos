import type { SDComponentType, SDProblem } from "./problems";

const NODE_W = 150;
const NODE_H = 56;
const VB_W = 560;
const VB_H = 680;

// Where the line from `fromX,fromY` toward the center of a box hits that box's
// border - so arrowheads land on the edge (visible), not under the opaque box.
function borderPoint(fromX: number, fromY: number, bx: number, by: number) {
  const cx = bx + NODE_W / 2;
  const cy = by + NODE_H / 2;
  const dx = cx - fromX;
  const dy = cy - fromY;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const s = Math.min(NODE_W / 2 / Math.abs(dx || 1e-6), NODE_H / 2 / Math.abs(dy || 1e-6));
  return { x: cx - dx * s, y: cy - dy * s };
}

export function SystemDiagram({
  problem,
  revealed,
  current,
}: {
  problem: SDProblem;
  revealed: Set<SDComponentType>;
  current?: SDComponentType;
}) {
  const c = (t: SDComponentType) => ({
    cx: problem.layout[t].x + NODE_W / 2,
    cy: problem.layout[t].y + NODE_H / 2,
  });

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full">
      <defs>
        <marker id="sd-arrow-d" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="fill-coral" />
        </marker>
      </defs>

      {problem.connections.map(([from, to], i) => {
        const on = revealed.has(from) && revealed.has(to);
        const touchesCurrent = current === from || current === to;
        const a = c(from);
        const b = c(to);
        const start = borderPoint(b.cx, b.cy, problem.layout[from].x, problem.layout[from].y);
        const end = borderPoint(a.cx, a.cy, problem.layout[to].x, problem.layout[to].y);
        const label = problem.edgeLabels?.[`${from}>${to}`];
        const mx = (start.x + end.x) / 2;
        const my = (start.y + end.y) / 2;
        return (
          <g key={i}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={on ? "stroke-coral" : "stroke-border"}
              strokeWidth={on && touchesCurrent ? 2.25 : on ? 1.5 : 1}
              markerEnd={on ? "url(#sd-arrow-d)" : undefined}
              opacity={on ? 1 : 0.35}
            />
            {on && label && (
              <>
                <rect x={mx - label.length * 3.6 - 4} y={my - 9} width={label.length * 7.2 + 8} height={18} rx={5} className="fill-background" opacity={0.92} />
                <text x={mx} y={my + 4} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                  {label}
                </text>
              </>
            )}
          </g>
        );
      })}

      {problem.palette.map((comp) => {
        const on = revealed.has(comp.type);
        const isCurrent = current === comp.type;
        const { x, y } = problem.layout[comp.type];
        return (
          <g key={comp.type} opacity={on ? 1 : 0.4}>
            {isCurrent && (
              <rect x={x - 4} y={y - 4} width={NODE_W + 8} height={NODE_H + 8} rx={15} className="fill-coral" opacity={0.12} />
            )}
            <rect
              x={x}
              y={y}
              width={NODE_W}
              height={NODE_H}
              rx={12}
              className={on ? "fill-background stroke-coral" : "fill-background stroke-border"}
              strokeWidth={isCurrent ? 3 : on ? 2 : 1.5}
            />
            <text
              x={x + NODE_W / 2}
              y={y + NODE_H / 2 + 5}
              textAnchor="middle"
              className="fill-foreground text-[14px] font-semibold"
            >
              {comp.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
