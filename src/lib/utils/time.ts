/**
 * 分数を「Xh Ym」形式の文字列にフォーマットします。
 * @param minutes 分数（小数可）
 */
export function formatMinutes(minutes: number): string {
  const totalMinutes = Math.floor(minutes);
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
