// Where the line from (fx, fy) toward the center of a w×h box at (x, y) crosses
// the box's border - so arrowheads land on the edge instead of under the box.
export function borderPoint(fx: number, fy: number, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = cx - fx;
  const dy = cy - fy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min(w / 2 / Math.abs(dx || 1e-6), h / 2 / Math.abs(dy || 1e-6));
  return { x: cx - dx * s, y: cy - dy * s };
}
