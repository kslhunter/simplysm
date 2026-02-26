/**
 * Flatten nested object to dot-notation keys
 * @example
 * flatten({ a: { b: { c: "value" } } })
 * // { "a.b.c": "value" }
 */
export function flattenDict(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenDict(value as Record<string, unknown>, fullKey));
    }
  }

  return result;
}

/**
 * Merge two flat dictionaries (b overwrites a)
 */
export function mergeDict(a: Record<string, string>, b: Record<string, string>): Record<string, string> {
  return { ...a, ...b };
}

/**
 * Interpolate template with {{key}} syntax
 * @example
 * interpolate("Hello {{name}}", { name: "World" }) // "Hello World"
 */
export function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
}
