const palette = [
  "bg-[#d9d3c4] text-[#1a1915]",
  "bg-[#c9d8d0] text-[#16302a]",
  "bg-[#e3d2bf] text-[#4a2f17]",
  "bg-[#d3d6dc] text-[#232a33]",
  "bg-[#ddd0d6] text-[#3b2530]",
  "bg-[#d6dcc4] text-[#2c3318]",
];

export function initialsOf(name?: string | null): string {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export function colorFor(key?: string | null): string {
  const k = key ?? "";
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
