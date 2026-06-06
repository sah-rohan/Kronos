const palette = [
  "bg-[#111] text-white",
  "bg-coral text-white",
  "bg-sky text-sky-foreground",
  "bg-[#f5c26b] text-[#5a3a0a]",
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
