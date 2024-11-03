export function transformBoolean(value: boolean | "" | undefined): boolean {
  return value != null && value !== false;
}

export function transformNullableBoolean(value: boolean | "" | undefined): boolean | undefined {
  if (value == null) return undefined;
  return value !== false;
}

// export function transformNumber(value: number | string | undefined): number {
//   return NumberUtil.parseFloat(value);
// }
