import { calcDiscountRate } from './discount'

describe('calcDiscountRate', () => {
  test('0원 → 0', () => expect(calcDiscountRate(0)).toBe(0))
  test('99999원 → 0', () => expect(calcDiscountRate(99999)).toBe(0))
  test('100000원 → 0.05', () => expect(calcDiscountRate(100000)).toBe(0.05))
  test('499999원 → 0.05', () => expect(calcDiscountRate(499999)).toBe(0.05))
  test('500000원 → 0.10', () => expect(calcDiscountRate(500000)).toBe(0.10))
  test('999999원 → 0.10', () => expect(calcDiscountRate(999999)).toBe(0.10))
  test('1000000원 → 0.15', () => expect(calcDiscountRate(1000000)).toBe(0.15))
})
