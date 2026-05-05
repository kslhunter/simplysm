// 할인율 계산 (금액별 차등)
export function calcDiscountRate(amount: number): number {
  if (amount >= 1_000_000) return 0.15
  if (amount >= 500_000) return 0.10
  if (amount >= 100_000) return 0.05
  return 0
}
