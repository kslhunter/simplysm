export function colorValidator(value: string): boolean {
  const result = /^#[0-9a-fA-F]*$/.test(value);
  return result;
}
