export function transformNullableBoolean(value: boolean | "" | undefined): boolean | undefined {
  if (value == null) return undefined;
  return value !== false;
}
