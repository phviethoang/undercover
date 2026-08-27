export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* không hỗ trợ — bỏ qua */
  }
}
