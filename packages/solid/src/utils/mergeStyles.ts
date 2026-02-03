import { type JSX } from "solid-js";

/**
 * CSS 스타일을 병합하는 유틸리티 함수
 *
 * @remarks
 * - string과 object 형태의 스타일을 모두 지원
 * - object 형태는 하나의 객체로 병합 (나중 값이 우선)
 * - string은 파싱하여 병합
 * - undefined는 무시
 *
 * @example
 * ```tsx
 * // Object 병합
 * mergeStyles({ color: "red" }, { background: "blue" })
 * // => { color: "red", background: "blue" }
 *
 * // String 병합
 * mergeStyles("color: red;", "background: blue;")
 * // => { color: "red", background: "blue" }
 *
 * // Mixed 병합
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
      // CSS string 파싱
      const declarations = style.split(";").filter((s) => s.trim());
      for (const declaration of declarations) {
        const colonIndex = declaration.indexOf(":");
        if (colonIndex === -1) continue;

        const property = declaration.slice(0, colonIndex).trim();
        const value = declaration.slice(colonIndex + 1).trim();
        if (property && value) {
          // kebab-case를 camelCase로 변환
          const camelProperty = property.replace(/-([a-z])/g, (_, letter: string) =>
            letter.toUpperCase(),
          );
          result[camelProperty] = value;
        }
      }
    } else {
      // Object 스타일 병합
      Object.assign(result, style);
    }
  }

  return result as JSX.CSSProperties;
}
