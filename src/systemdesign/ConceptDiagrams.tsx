// Our own illustrations of standard CS concepts (trie, hash ring, token bucket,
// Snowflake ID layout). Generic structures drawn in the app's coral style.

function Node({ x, y, w = 64, h = 34, label, done }: { x: number; y: number; w?: number; h?: number; label: string; done?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={9} className={done ? "fill-background stroke-[#3fae6a]" : "fill-background stroke-border"} strokeWidth={done ? 2.5 : 1.75} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="fill-foreground text-[12px] font-medium">{label}</text>
    </g>
  );
}
function Edge({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-coral" strokeWidth={1.5} markerEnd="url(#cc-arrow)" />;
}
function Svg({ vb, children }: { vb: string; children: React.ReactNode }) {
  return (
    <svg viewBox={vb} className="h-auto w-full">
      <defs>
        <marker id="cc-arrow" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="fill-coral" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

export function ConceptDiagram({ id }: { id: string }) {
  switch (id) {
    case "trie":
      // Generic trie holding cat, car, can, do, dog. Green = a complete word.
      return (
        <Svg vb="0 0 460 320">
          <Node x={198} y={10} w={64} label="root" />
          <Node x={120} y={85} w={50} label="c" />
          <Node x={300} y={85} w={50} label="d" />
          <Node x={120} y={160} w={50} label="ca" />
          <Node x={300} y={160} w={50} label="do" />
          <Node x={20} y={250} w={64} label="cat" done />
          <Node x={110} y={250} w={64} label="car" done />
          <Node x={200} y={250} w={64} label="can" done />
          <Node x={300} y={250} w={64} label="dog" done />
          <Edge x1={230} y1={44} x2={150} y2={84} />
          <Edge x1={230} y1={44} x2={325} y2={84} />
          <Edge x1={145} y1={119} x2={145} y2={159} />
          <Edge x1={325} y1={119} x2={325} y2={159} />
          <Edge x1={140} y1={194} x2={60} y2={249} />
          <Edge x1={145} y1={194} x2={142} y2={249} />
          <Edge x1={150} y1={194} x2={228} y2={249} />
          <Edge x1={325} y1={194} x2={332} y2={249} />
        </Svg>
      );
    case "hash_ring": {
      const cx = 230, cy = 160, r = 120;
      const at = (deg: number, rr = r) => ({ x: cx + rr * Math.cos((deg - 90) * Math.PI / 180), y: cy + rr * Math.sin((deg - 90) * Math.PI / 180) });
      const servers = [20, 140, 250];
      const keys = [70, 110, 190, 300, 330];
      return (
        <Svg vb="0 0 460 320">
          <circle cx={cx} cy={cy} r={r} className="fill-none stroke-border" strokeWidth={1.5} />
          {keys.map((d, i) => { const p = at(d); return <g key={`k${i}`}><circle cx={p.x} cy={p.y} r={5} className="fill-coral" /></g>; })}
          {servers.map((d, i) => { const p = at(d); return (
            <g key={`s${i}`}>
              <rect x={p.x - 26} y={p.y - 15} width={52} height={30} rx={8} className="fill-background stroke-coral" strokeWidth={2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">S{i + 1}</text>
            </g>
          ); })}
          <text x={cx} y={cy - 4} textAnchor="middle" className="fill-muted-foreground text-[11px]">hash ring</text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">key → next server clockwise</text>
        </Svg>
      );
    }
    case "token_bucket":
      return (
        <Svg vb="0 0 460 240">
          <text x={110} y={30} textAnchor="middle" className="fill-muted-foreground text-[11px]">refill at a steady rate</text>
          <Edge x1={110} y1={38} x2={150} y2={70} />
          <rect x={150} y={70} width={150} height={120} rx={10} className="fill-none stroke-coral" strokeWidth={2} />
          {[[180, 110], [225, 110], [270, 110], [200, 150], [250, 150]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={11} className="fill-coral/30 stroke-coral" strokeWidth={1.5} />
          ))}
          <text x={225} y={205} textAnchor="middle" className="fill-muted-foreground text-[11px]">tokens (capacity = max burst)</text>
          <Edge x1={300} y1={130} x2={360} y2={130} />
          <text x={395} y={120} textAnchor="middle" className="fill-foreground text-[12px] font-medium">request</text>
          <text x={395} y={142} textAnchor="middle" className="fill-muted-foreground text-[10px]">spends 1 token</text>
        </Svg>
      );
    case "snowflake": {
      const segs = [
        { w: 30, label: "sign", bits: "1" },
        { w: 230, label: "timestamp", bits: "41 bits" },
        { w: 70, label: "machine", bits: "10" },
        { w: 90, label: "sequence", bits: "12" },
      ];
      let x = 20;
      return (
        <Svg vb="0 0 460 140">
          <text x={230} y={28} textAnchor="middle" className="fill-muted-foreground text-[11px]">64-bit ID</text>
          {segs.map((s) => { const el = (
            <g key={s.label}>
              <rect x={x} y={45} width={s.w} height={44} rx={6} className="fill-background stroke-coral" strokeWidth={1.75} />
              <text x={x + s.w / 2} y={68} textAnchor="middle" className="fill-foreground text-[11px] font-medium">{s.label}</text>
              <text x={x + s.w / 2} y={83} textAnchor="middle" className="fill-muted-foreground text-[10px]">{s.bits}</text>
            </g>
          ); x += s.w + 4; return el; })}
          <text x={230} y={115} textAnchor="middle" className="fill-muted-foreground text-[10px]">time leads → IDs sort by time; machine → no collisions</text>
        </Svg>
      );
    }
    default:
      return null;
  }
}
