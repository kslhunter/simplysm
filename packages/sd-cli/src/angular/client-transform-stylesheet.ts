import postcss from "postcss";
import { compileScssFileAsync, compileScssStringAsync } from "../utils/scss-compiler.js";

export interface ClientTransformStylesheetOptions {
  loadPaths: string[];
  postCssPlugins?: unknown[];
  scssErrors: string[];
  scssDependencies: Map<string, Set<string>>;
}

/**
 * client 빌드용 transformStylesheet 콜백 팩토리.
 * sass.compileAsync + PostCSS로 SCSS를 비동기 CSS 변환한다.
 *
 * - .scss 외부 파일: sass.compileAsync → PostCSS
 * - 인라인 SCSS (stylesheetFile 없음): sass.compileStringAsync → PostCSS
 * - .css 외부 파일: null 반환 (readResource가 원본 CSS 처리)
 */
export function createClientTransformStylesheet(
  options: ClientTransformStylesheetOptions,
): (data: string, containingFile: string, stylesheetFile?: string) => Promise<string | null> {
  const { loadPaths, postCssPlugins, scssErrors, scssDependencies } = options;

  const postCssProcessor =
    postCssPlugins != null && postCssPlugins.length > 0
      ? postcss(postCssPlugins as postcss.AcceptedPlugin[])
      : undefined;

  return async (
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ): Promise<string | null> => {
    // 외부 스타일시트 파일
    if (stylesheetFile != null) {
      if (stylesheetFile.endsWith(".scss")) {
        try {
          const result = await compileScssFileAsync(stylesheetFile, loadPaths);

          // 의존성 수집
          if (result.dependencies.length > 0) {
            scssDependencies.set(stylesheetFile, new Set(result.dependencies));
          }

          let css = result.css;
          if (postCssProcessor != null) {
            css = (await postCssProcessor.process(css, { from: stylesheetFile })).css;
          }
          return css;
        } catch (err) {
          scssErrors.push(`SCSS error in ${stylesheetFile}: ${err instanceof Error ? err.message : String(err)}`);
          return "/* SCSS compilation error */";
        }
      }
      // .css → externalStylesheets의 SHA256 ID 매핑으로 처리
      return null;
    }

    // 인라인 SCSS
    try {
      const result = await compileScssStringAsync(data, containingFile, loadPaths);

      // 의존성 수집
      if (result.dependencies.length > 0) {
        scssDependencies.set(containingFile, new Set(result.dependencies));
      }

      let css = result.css;
      if (postCssProcessor != null) {
        css = (await postCssProcessor.process(css, { from: containingFile })).css;
      }
      return css;
    } catch (err) {
      scssErrors.push(`SCSS error in ${containingFile}: ${err instanceof Error ? err.message : String(err)}`);
      return "/* SCSS compilation error */";
    }
  };
}
