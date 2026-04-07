import type { Plugin } from "vite";
import ts from "typescript";
import postcss from "postcss";

/** sdPostCssInlinePlugin 옵션 */
export interface SdPostCssInlinePluginOptions {
  /** PostCSS 플러그인 배열 */
  postCssPlugins: unknown[];
}

/**
 * JS 파일 내 Angular @Component 인라인 스타일에 PostCSS를 적용하는 Vite 플러그인.
 *
 * TS AST로 @Component decorator의 `styles` 배열에서 CSS 문자열을 추출하고,
 * PostCSS를 적용한 후 교체한다.
 */
export function sdPostCssInlinePlugin(options: SdPostCssInlinePluginOptions): Plugin {
  return {
    name: "sd-postcss-inline",
    enforce: "pre",

    async transform(code, id) {
      // .js/.mjs 파일만 대상
      if (!id.endsWith(".js") && !id.endsWith(".mjs")) return;

      // 빠른 체크: Component 키워드가 없으면 패스
      if (!code.includes("Component")) return;

      // PostCSS 플러그인이 없으면 패스
      if (options.postCssPlugins.length === 0) return;

      const result = await processPostCssInline(code, id, options.postCssPlugins);
      if (result === code) return; // 변경 없음

      return { code: result };
    },
  };
}

/**
 * JS 코드에서 Angular @Component의 styles CSS를 추출하고 PostCSS를 적용한다.
 */
export async function processPostCssInline(
  jsContent: string,
  filePath: string,
  postCssPlugins: unknown[],
): Promise<string> {
  const sourceFile = ts.createSourceFile(
    filePath,
    jsContent,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );

  // 교체할 범위를 수집
  const replacements: Array<{ start: number; end: number; cssText: string }> = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "Component" &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0];
      if (ts.isObjectLiteralExpression(arg)) {
        processComponentObject(arg);
      }
    }
    ts.forEachChild(node, visit);
  }

  function processComponentObject(obj: ts.ObjectLiteralExpression): void {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

      if (prop.name.text === "styles" && ts.isArrayLiteralExpression(prop.initializer)) {
        for (const element of prop.initializer.elements) {
          let cssText: string | undefined;
          let start: number;
          let end: number;

          if (ts.isStringLiteral(element)) {
            cssText = element.text;
            start = element.getStart(sourceFile);
            end = element.getEnd();
          } else if (ts.isNoSubstitutionTemplateLiteral(element)) {
            cssText = element.text;
            start = element.getStart(sourceFile);
            end = element.getEnd();
          } else {
            continue;
          }

          replacements.push({ start, end, cssText });
        }
      }
    }
  }

  visit(sourceFile);

  if (replacements.length === 0) return jsContent;

  // PostCSS 적용 및 교체
  const processor = postcss(postCssPlugins as postcss.AcceptedPlugin[]);
  const processedReplacements: Array<{ start: number; end: number; newText: string }> = [];

  for (const r of replacements) {
    const processed = await processor.process(r.cssText, { from: filePath });
    const newCss = processed.css.trim();
    const origChar = jsContent[r.start];

    if (origChar === "`") {
      processedReplacements.push({ start: r.start, end: r.end, newText: `\`${newCss}\`` });
    } else {
      const escaped =
        origChar === '"'
          ? newCss.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
          : newCss.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      processedReplacements.push({
        start: r.start,
        end: r.end,
        newText: `${origChar}${escaped}${origChar}`,
      });
    }
  }

  // 뒤에서부터 교체
  processedReplacements.sort((a, b) => b.start - a.start);

  let result = jsContent;
  for (const { start, end, newText } of processedReplacements) {
    result = result.slice(0, start) + newText + result.slice(end);
  }

  return result;
}
