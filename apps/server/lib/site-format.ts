/** Format amount in fen to yuan display string. */
export function formatPrice(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

export function yuanToFen(yuan: string): number | null {
  const n = Number.parseFloat(yuan.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
