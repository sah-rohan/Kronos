export function monthCounts(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const r = ((year * 12 + month) * 31 + i * 73 + 11) % 17;
    return r > 11 ? 3 : r > 8 ? 2 : r > 4 ? 1 : 0;
  });
}

export const CAL_START = { year: 2026, month: 5 };
export const CAL_END = { year: 2026, month: 8 };
