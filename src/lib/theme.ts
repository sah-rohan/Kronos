
export function isNight(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 19 || h < 7;
}

export function effectiveDark(theme: "auto" | "light" | "dark"): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return isNight();
}
