// Small schematic diagrams for the component library, in the app's coral/box style.

function Box({ x, y, w = 110, h = 40, label }: { x: number; y: number; w?: number; h?: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={9} className="fill-background stroke-coral" strokeWidth={1.75} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="fill-foreground text-[12px] font-medium">
        {label}
      </text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-coral" strokeWidth={1.5} markerEnd="url(#cd-arrow)" />;
}

function Svg({ vb, children }: { vb: string; children: React.ReactNode }) {
  return (
    <svg viewBox={vb} className="h-auto w-full">
      <defs>
        <marker id="cd-arrow" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="fill-coral" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

export function ComponentDiagram({ id }: { id: string }) {
  switch (id) {
    case "microservices":
      return (
        <Svg vb="0 0 460 200">
          <Box x={175} y={10} w={110} label="Client" />
          <Box x={170} y={75} w={120} label="API Gateway" />
          <Arrow x1={230} y1={50} x2={230} y2={73} />
          {[
            { x: 20, label: "Product" },
            { x: 175, label: "Order" },
            { x: 330, label: "Payment" },
          ].map((s) => (
            <g key={s.label}>
              <Arrow x1={230} y1={115} x2={s.x + 55} y2={143} />
              <Box x={s.x} y={145} w={110} h={36} label={s.label} />
              <rect x={s.x + 25} y={186} width={60} height={12} rx={3} className="fill-background stroke-border" strokeWidth={1.25} />
            </g>
          ))}
        </Svg>
      );
    case "relational":
      return (
        <Svg vb="0 0 460 180">
          <g>
            <rect x={30} y={20} width={150} height={130} rx={9} className="fill-background stroke-coral" strokeWidth={1.75} />
            <text x={105} y={42} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">Users</text>
            <text x={105} y={70} textAnchor="middle" className="fill-muted-foreground text-[11px]">user_id (PK)</text>
            <text x={105} y={92} textAnchor="middle" className="fill-muted-foreground text-[11px]">name</text>
            <text x={105} y={114} textAnchor="middle" className="fill-muted-foreground text-[11px]">email</text>
          </g>
          <Arrow x1={180} y1={85} x2={278} y2={85} />
          <g>
            <rect x={280} y={20} width={150} height={130} rx={9} className="fill-background stroke-coral" strokeWidth={1.75} />
            <text x={355} y={42} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">Orders</text>
            <text x={355} y={70} textAnchor="middle" className="fill-muted-foreground text-[11px]">order_id (PK)</text>
            <text x={355} y={92} textAnchor="middle" className="fill-muted-foreground text-[11px]">user_id (FK)</text>
            <text x={355} y={114} textAnchor="middle" className="fill-muted-foreground text-[11px]">total</text>
          </g>
        </Svg>
      );
    case "nosql":
      return (
        <Svg vb="0 0 460 130">
          {[
            { x: 10, label: "Key-Value" },
            { x: 125, label: "Document" },
            { x: 240, label: "Column" },
            { x: 355, label: "Graph" },
          ].map((s) => (
            <Box key={s.label} x={s.x} y={45} w={95} h={42} label={s.label} />
          ))}
        </Svg>
      );
    case "object_storage":
      return (
        <Svg vb="0 0 460 180">
          <rect x={60} y={20} width={340} height={140} rx={12} className="fill-background stroke-coral" strokeWidth={1.75} />
          <text x={230} y={42} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">Bucket</text>
          {["photos/cat.jpg", "videos/v1.mp4", "logs/2024.txt"].map((k, i) => (
            <g key={k}>
              <rect x={85} y={58 + i * 32} width={290} height={26} rx={6} className="fill-background stroke-border" strokeWidth={1.25} />
              <text x={100} y={75 + i * 32} className="fill-muted-foreground text-[11px]">{k}</text>
            </g>
          ))}
        </Svg>
      );
    case "cache":
      return (
        <Svg vb="0 0 460 120">
          <Box x={10} y={40} w={110} label="App" />
          <Box x={175} y={40} w={110} label="Cache" />
          <Box x={340} y={40} w={110} label="Database" />
          <Arrow x1={120} y1={60} x2={173} y2={60} />
          <Arrow x1={285} y1={60} x2={338} y2={60} />
          <text x={147} y={32} textAnchor="middle" className="fill-muted-foreground text-[10px]">hit ~1ms</text>
          <text x={312} y={32} textAnchor="middle" className="fill-muted-foreground text-[10px]">miss</text>
        </Svg>
      );
    case "cdn":
      return (
        <Svg vb="0 0 460 200">
          <Box x={175} y={10} w={110} label="Origin" />
          {[
            { x: 30, label: "Edge LA" },
            { x: 175, label: "Edge LON" },
            { x: 320, label: "Edge TYO" },
          ].map((e) => (
            <g key={e.label}>
              <Arrow x1={230} y1={50} x2={e.x + 55} y2={88} />
              <Box x={e.x} y={90} w={110} h={36} label={e.label} />
              <Arrow x1={e.x + 55} y1={126} x2={e.x + 55} y2={158} />
              <Box x={e.x + 20} y={160} w={70} h={32} label="User" />
            </g>
          ))}
        </Svg>
      );
    case "message_queue":
      return (
        <Svg vb="0 0 460 130">
          <Box x={10} y={45} w={100} label="Producer" />
          <g>
            <rect x={150} y={45} width={160} height={42} rx={9} className="fill-background stroke-coral" strokeWidth={1.75} />
            <text x={230} y={70} textAnchor="middle" className="fill-foreground text-[12px] font-medium">Queue ▮▮▮</text>
          </g>
          <Box x={350} y={20} w={100} h={36} label="Consumer" />
          <Box x={350} y={75} w={100} h={36} label="Consumer" />
          <Arrow x1={110} y1={66} x2={148} y2={66} />
          <Arrow x1={310} y1={60} x2={348} y2={40} />
          <Arrow x1={310} y1={70} x2={348} y2={92} />
        </Svg>
      );
    case "api_gateway":
      return (
        <Svg vb="0 0 460 200">
          {[
            { y: 20, label: "Web" },
            { y: 80, label: "Mobile" },
          ].map((c) => (
            <g key={c.label}>
              <Box x={10} y={c.y} w={90} h={36} label={c.label} />
              <Arrow x1={100} y1={c.y + 18} x2={168} y2={95} />
            </g>
          ))}
          <Box x={170} y={75} w={120} label="API Gateway" />
          {[
            { y: 10, label: "User Svc" },
            { y: 78, label: "Order Svc" },
            { y: 146, label: "Payment Svc" },
          ].map((s) => (
            <g key={s.label}>
              <Arrow x1={290} y1={95} x2={348} y2={s.y + 18} />
              <Box x={350} y={s.y} w={100} h={36} label={s.label} />
            </g>
          ))}
        </Svg>
      );
    case "load_balancer":
      return (
        <Svg vb="0 0 460 200">
          <Box x={175} y={10} w={110} label="Clients" />
          <Box x={170} y={80} w={120} label="Load Balancer" />
          <Arrow x1={230} y1={50} x2={230} y2={78} />
          {[20, 175, 330].map((x, i) => (
            <g key={x}>
              <Arrow x1={230} y1={120} x2={x + 55} y2={153} />
              <Box x={x} y={155} w={110} h={36} label={`Server ${i + 1}`} />
            </g>
          ))}
        </Svg>
      );
    case "db_replication":
      return (
        <Svg vb="0 0 460 200">
          <Box x={170} y={15} w={120} label="Primary (W)" />
          {[20, 175, 330].map((x) => (
            <g key={x}>
              <Arrow x1={230} y1={55} x2={x + 55} y2={143} />
              <Box x={x} y={145} w={110} h={36} label="Replica (R)" />
            </g>
          ))}
        </Svg>
      );
    case "sharding":
      return (
        <Svg vb="0 0 460 150">
          <Box x={175} y={10} w={110} label="Router" />
          {[
            { x: 20, label: "Shard 0" },
            { x: 175, label: "Shard 1" },
            { x: 330, label: "Shard 2" },
          ].map((s) => (
            <g key={s.label}>
              <Arrow x1={230} y1={50} x2={s.x + 55} y2={88} />
              <Box x={s.x} y={90} w={110} h={40} label={s.label} />
            </g>
          ))}
        </Svg>
      );
    default:
      return null;
  }
}
