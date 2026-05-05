// 금액 유효성: 양수 정수, 1조 미만
export function isValidAmount(amount: number): boolean {
  if (!Number.isInteger(amount)) return false
  if (amount <= 0) return false
  if (amount >= 1_000_000_000_000) return false
  return true
}
