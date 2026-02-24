import { type JSX } from "solid-js";

/**
 * Utility function that merges CSS styles.
 *
 * @remarks
 * - Supports both string and object style formats
 * - Object styles are merged into a single object (later values take precedence)
 * - Strings are parsed and merged
 * - undefined values are ignored
 *
 * @example
 * ```tsx
 * // Object merge
 * mergeStyles({ color: "red" }, { background: "blue" })
 * // => { color: "red", background: "blue" }
 *
 * // String merge
 * mergeStyles("color: red;", "background: blue;")
 * // => { color: "red", background: "blue" }
 *
 * // Mixed merge
 * mergeStyles({ color: "red" }, "background: blue;")
 * // => { color: "red", background: "blue" }
 * ```
 */
export function mergeStyles(
  ...styles: (JSX.CSSProperties | string | undefined)[]
): JSX.CSSProperties {
  const result: Record<string, string> = {};

  for (const style of styles) {
    if (style === undefined) continue;

    if (typeof style === "string") {
      // Parse CSS string
      const declarations = style.split(";").filter((s) => s.trim());
      for (const declaration of declarations) {
        const colonIndex = declaration.indexOf(":");
        if (colonIndex === -1) continue;

        const property = declaration.slice(0, colonIndex).trim();
        const value = declaration.slice(colonIndex + 1).trim();
        if (property && value) {
          // Convert kebab-case to camelCase
          const camelProperty = property.replace(/-([a-z])/g, (_, letter: string) =>
            letter.toUpperCase(),
          );
          result[camelProperty] = value;
        }
      }
    } else {
      // Merge object styles
      Object.assign(result, style);
    }
  }

  return result as JSX.CSSProperties;
}
