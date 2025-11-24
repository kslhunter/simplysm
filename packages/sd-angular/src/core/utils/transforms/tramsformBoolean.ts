export function transformBoolean(value: boolean | "" | undefined): boolean {
  return value != null && value !== false;
}
