// Zero-padded 1-based position: 0 -> "01".
export const num = (i: number) => String(i + 1).padStart(2, "0");

export const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;
