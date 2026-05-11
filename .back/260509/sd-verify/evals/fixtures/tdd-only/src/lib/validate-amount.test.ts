import { isValidAmount } from './validate-amount'

describe('isValidAmount', () => {
  test('0 → false', () => expect(isValidAmount(0)).toBe(false))
  test('-1 → false', () => expect(isValidAmount(-1)).toBe(false))
  test('1.5 → false', () => expect(isValidAmount(1.5)).toBe(false))
  test('1 → true', () => expect(isValidAmount(1)).toBe(true))
  test('999999999999 → true', () => expect(isValidAmount(999999999999)).toBe(true))
  test('1000000000000 → false', () => expect(isValidAmount(1000000000000)).toBe(false))
})
