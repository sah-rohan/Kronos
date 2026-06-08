const palette = [
  "bg-[#e07a5f] text-white",
  "bg-[#3d8bff] text-white",
  "bg-[#f2b705] text-[#4a3500]",
  "bg-[#2a9d8f] text-white",
  "bg-[#8a5cf6] text-white",
  "bg-[#e76f9e] text-white",
  "bg-[#0fb5ba] text-white",
  "bg-[#f4845f] text-white",
  "bg-[#5b8def] text-white",
  "bg-[#7cb342] text-white",
  "bg-[#ef5da8] text-white",
  "bg-[#5a4fcf] text-white",
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
