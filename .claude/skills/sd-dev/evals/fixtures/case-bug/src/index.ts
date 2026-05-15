export function toCamelCase(input: string): string {
  const parts = input.split(/[-_]/).filter(Boolean);
  return (
    parts[0].toLowerCase() +
    parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join("")
  );
}
