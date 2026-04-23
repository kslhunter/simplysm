import { describe, it, expect } from "vitest";
import cssText from "../../scss/styles.scss?inline";

/**
 * CSS 출력 동일성 검증: 리팩토링 전후 생성되는 CSS 유틸리티 클래스가 동일한지 확인한다.
 * .bd-trans → .bd-transparent 변경은 의도된 변경이므로, 기준선에서 이미 정규화되어 있다.
 *
 * 기준선: dist/styles.css(리팩토링 전 빌드)에서 추출한 유틸리티 클래스 선택자 집합.
 */
describe("Feature 1.1 Slice 5: CSS 출력 동일성 검증", () => {
  /**
   * CSS 텍스트에서 @layer utilities 블록 내의 모든 클래스 선택자(.xxx)를 추출한다.
   */
  function extractClassSelectors(css: string): string[] {
    const layerMatch = css.match(/@layer\s+utilities\s*\{([\s\S]*)\}\s*$/);
    if (!layerMatch) return [];

    const utilitiesBlock = layerMatch[1];
    const selectorRegex = /(\.[a-zA-Z][\w-]*)\s*\{/g;
    const selectors: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = selectorRegex.exec(utilitiesBlock)) != null) {
      selectors.push(match[1].trim());
    }
    return [...new Set(selectors)].sort();
  }

  // 리팩토링 전 dist/styles.css에서 추출한 유틸리티 클래스 선택자 (정규화: .bd-trans → .bd-transparent)
  const baselineSelectors = [
    ".bd", ".bd-color-dark", ".bd-color-darker", ".bd-color-default", ".bd-color-light",
    ".bd-color-lighter", ".bd-none", ".bd-radius-default", ".bd-radius-lg", ".bd-radius-sm",
    ".bd-radius-xl", ".bd-radius-xs", ".bd-radius-xxl",
    ".bd-theme-blue-gray-dark", ".bd-theme-blue-gray-darker", ".bd-theme-blue-gray-darkest",
    ".bd-theme-blue-gray-default", ".bd-theme-blue-gray-light", ".bd-theme-blue-gray-lighter",
    ".bd-theme-blue-gray-lightest", ".bd-theme-danger-dark", ".bd-theme-danger-darker",
    ".bd-theme-danger-darkest", ".bd-theme-danger-default", ".bd-theme-danger-light",
    ".bd-theme-danger-lighter", ".bd-theme-danger-lightest", ".bd-theme-gray-dark",
    ".bd-theme-gray-darker", ".bd-theme-gray-darkest", ".bd-theme-gray-default",
    ".bd-theme-gray-light", ".bd-theme-gray-lighter", ".bd-theme-gray-lightest",
    ".bd-theme-info-dark", ".bd-theme-info-darker", ".bd-theme-info-darkest",
    ".bd-theme-info-default", ".bd-theme-info-light", ".bd-theme-info-lighter",
    ".bd-theme-info-lightest", ".bd-theme-primary-dark", ".bd-theme-primary-darker",
    ".bd-theme-primary-darkest", ".bd-theme-primary-default", ".bd-theme-primary-light",
    ".bd-theme-primary-lighter", ".bd-theme-primary-lightest", ".bd-theme-secondary-dark",
    ".bd-theme-secondary-darker", ".bd-theme-secondary-darkest", ".bd-theme-secondary-default",
    ".bd-theme-secondary-light", ".bd-theme-secondary-lighter", ".bd-theme-secondary-lightest",
    ".bd-theme-success-dark", ".bd-theme-success-darker", ".bd-theme-success-darkest",
    ".bd-theme-success-default", ".bd-theme-success-light", ".bd-theme-success-lighter",
    ".bd-theme-success-lightest", ".bd-theme-warning-dark", ".bd-theme-warning-darker",
    ".bd-theme-warning-darkest", ".bd-theme-warning-default", ".bd-theme-warning-light",
    ".bd-theme-warning-lighter", ".bd-theme-warning-lightest",
    ".bd-trans-dark", ".bd-trans-darker", ".bd-trans-darkest", ".bd-trans-default",
    ".bd-trans-light", ".bd-trans-lighter", ".bd-trans-lightest", ".bd-trans-rev-default",
    ".bd-trans-rev-light", ".bd-trans-rev-lighter", ".bd-trans-rev-lightest",
    ".bd-transparent",
    ".bd-width-0", ".bd-width-auto", ".bd-width-default", ".bd-width-lg", ".bd-width-sm",
    ".bd-width-xl", ".bd-width-xs", ".bd-width-xxl", ".bd-width-xxs",
    ".bdb", ".bdb-color-dark", ".bdb-color-darker", ".bdb-color-default", ".bdb-color-light",
    ".bdb-color-lighter", ".bdb-none", ".bdb-radius-default", ".bdb-radius-lg", ".bdb-radius-sm",
    ".bdb-radius-xl", ".bdb-radius-xs", ".bdb-radius-xxl",
    ".bdb-theme-blue-gray-dark", ".bdb-theme-blue-gray-darker", ".bdb-theme-blue-gray-darkest",
    ".bdb-theme-blue-gray-default", ".bdb-theme-blue-gray-light", ".bdb-theme-blue-gray-lighter",
    ".bdb-theme-blue-gray-lightest", ".bdb-theme-danger-dark", ".bdb-theme-danger-darker",
    ".bdb-theme-danger-darkest", ".bdb-theme-danger-default", ".bdb-theme-danger-light",
    ".bdb-theme-danger-lighter", ".bdb-theme-danger-lightest", ".bdb-theme-gray-dark",
    ".bdb-theme-gray-darker", ".bdb-theme-gray-darkest", ".bdb-theme-gray-default",
    ".bdb-theme-gray-light", ".bdb-theme-gray-lighter", ".bdb-theme-gray-lightest",
    ".bdb-theme-info-dark", ".bdb-theme-info-darker", ".bdb-theme-info-darkest",
    ".bdb-theme-info-default", ".bdb-theme-info-light", ".bdb-theme-info-lighter",
    ".bdb-theme-info-lightest", ".bdb-theme-primary-dark", ".bdb-theme-primary-darker",
    ".bdb-theme-primary-darkest", ".bdb-theme-primary-default", ".bdb-theme-primary-light",
    ".bdb-theme-primary-lighter", ".bdb-theme-primary-lightest", ".bdb-theme-secondary-dark",
    ".bdb-theme-secondary-darker", ".bdb-theme-secondary-darkest", ".bdb-theme-secondary-default",
    ".bdb-theme-secondary-light", ".bdb-theme-secondary-lighter", ".bdb-theme-secondary-lightest",
    ".bdb-theme-success-dark", ".bdb-theme-success-darker", ".bdb-theme-success-darkest",
    ".bdb-theme-success-default", ".bdb-theme-success-light", ".bdb-theme-success-lighter",
    ".bdb-theme-success-lightest", ".bdb-theme-warning-dark", ".bdb-theme-warning-darker",
    ".bdb-theme-warning-darkest", ".bdb-theme-warning-default", ".bdb-theme-warning-light",
    ".bdb-theme-warning-lighter", ".bdb-theme-warning-lightest",
    ".bdb-trans-dark", ".bdb-trans-darker", ".bdb-trans-darkest", ".bdb-trans-default",
    ".bdb-trans-light", ".bdb-trans-lighter", ".bdb-trans-lightest", ".bdb-trans-rev-default",
    ".bdb-trans-rev-light", ".bdb-trans-rev-lighter", ".bdb-trans-rev-lightest",
    ".bdb-transparent",
    ".bdb-width-0", ".bdb-width-auto", ".bdb-width-default", ".bdb-width-lg", ".bdb-width-sm",
    ".bdb-width-xl", ".bdb-width-xs", ".bdb-width-xxl", ".bdb-width-xxs",
    ".bdl", ".bdl-color-dark", ".bdl-color-darker", ".bdl-color-default", ".bdl-color-light",
    ".bdl-color-lighter", ".bdl-none", ".bdl-radius-default", ".bdl-radius-lg", ".bdl-radius-sm",
    ".bdl-radius-xl", ".bdl-radius-xs", ".bdl-radius-xxl",
    ".bdl-theme-blue-gray-dark", ".bdl-theme-blue-gray-darker", ".bdl-theme-blue-gray-darkest",
    ".bdl-theme-blue-gray-default", ".bdl-theme-blue-gray-light", ".bdl-theme-blue-gray-lighter",
    ".bdl-theme-blue-gray-lightest", ".bdl-theme-danger-dark", ".bdl-theme-danger-darker",
    ".bdl-theme-danger-darkest", ".bdl-theme-danger-default", ".bdl-theme-danger-light",
    ".bdl-theme-danger-lighter", ".bdl-theme-danger-lightest", ".bdl-theme-gray-dark",
    ".bdl-theme-gray-darker", ".bdl-theme-gray-darkest", ".bdl-theme-gray-default",
    ".bdl-theme-gray-light", ".bdl-theme-gray-lighter", ".bdl-theme-gray-lightest",
    ".bdl-theme-info-dark", ".bdl-theme-info-darker", ".bdl-theme-info-darkest",
    ".bdl-theme-info-default", ".bdl-theme-info-light", ".bdl-theme-info-lighter",
    ".bdl-theme-info-lightest", ".bdl-theme-primary-dark", ".bdl-theme-primary-darker",
    ".bdl-theme-primary-darkest", ".bdl-theme-primary-default", ".bdl-theme-primary-light",
    ".bdl-theme-primary-lighter", ".bdl-theme-primary-lightest", ".bdl-theme-secondary-dark",
    ".bdl-theme-secondary-darker", ".bdl-theme-secondary-darkest", ".bdl-theme-secondary-default",
    ".bdl-theme-secondary-light", ".bdl-theme-secondary-lighter", ".bdl-theme-secondary-lightest",
    ".bdl-theme-success-dark", ".bdl-theme-success-darker", ".bdl-theme-success-darkest",
    ".bdl-theme-success-default", ".bdl-theme-success-light", ".bdl-theme-success-lighter",
    ".bdl-theme-success-lightest", ".bdl-theme-warning-dark", ".bdl-theme-warning-darker",
    ".bdl-theme-warning-darkest", ".bdl-theme-warning-default", ".bdl-theme-warning-light",
    ".bdl-theme-warning-lighter", ".bdl-theme-warning-lightest",
    ".bdl-trans-dark", ".bdl-trans-darker", ".bdl-trans-darkest", ".bdl-trans-default",
    ".bdl-trans-light", ".bdl-trans-lighter", ".bdl-trans-lightest", ".bdl-trans-rev-default",
    ".bdl-trans-rev-light", ".bdl-trans-rev-lighter", ".bdl-trans-rev-lightest",
    ".bdl-transparent",
    ".bdl-width-0", ".bdl-width-auto", ".bdl-width-default", ".bdl-width-lg", ".bdl-width-sm",
    ".bdl-width-xl", ".bdl-width-xs", ".bdl-width-xxl", ".bdl-width-xxs",
    ".bdr", ".bdr-color-dark", ".bdr-color-darker", ".bdr-color-default", ".bdr-color-light",
    ".bdr-color-lighter", ".bdr-none", ".bdr-radius-default", ".bdr-radius-lg", ".bdr-radius-sm",
    ".bdr-radius-xl", ".bdr-radius-xs", ".bdr-radius-xxl",
    ".bdr-theme-blue-gray-dark", ".bdr-theme-blue-gray-darker", ".bdr-theme-blue-gray-darkest",
    ".bdr-theme-blue-gray-default", ".bdr-theme-blue-gray-light", ".bdr-theme-blue-gray-lighter",
    ".bdr-theme-blue-gray-lightest", ".bdr-theme-danger-dark", ".bdr-theme-danger-darker",
    ".bdr-theme-danger-darkest", ".bdr-theme-danger-default", ".bdr-theme-danger-light",
    ".bdr-theme-danger-lighter", ".bdr-theme-danger-lightest", ".bdr-theme-gray-dark",
    ".bdr-theme-gray-darker", ".bdr-theme-gray-darkest", ".bdr-theme-gray-default",
    ".bdr-theme-gray-light", ".bdr-theme-gray-lighter", ".bdr-theme-gray-lightest",
    ".bdr-theme-info-dark", ".bdr-theme-info-darker", ".bdr-theme-info-darkest",
    ".bdr-theme-info-default", ".bdr-theme-info-light", ".bdr-theme-info-lighter",
    ".bdr-theme-info-lightest", ".bdr-theme-primary-dark", ".bdr-theme-primary-darker",
    ".bdr-theme-primary-darkest", ".bdr-theme-primary-default", ".bdr-theme-primary-light",
    ".bdr-theme-primary-lighter", ".bdr-theme-primary-lightest", ".bdr-theme-secondary-dark",
    ".bdr-theme-secondary-darker", ".bdr-theme-secondary-darkest", ".bdr-theme-secondary-default",
    ".bdr-theme-secondary-light", ".bdr-theme-secondary-lighter", ".bdr-theme-secondary-lightest",
    ".bdr-theme-success-dark", ".bdr-theme-success-darker", ".bdr-theme-success-darkest",
    ".bdr-theme-success-default", ".bdr-theme-success-light", ".bdr-theme-success-lighter",
    ".bdr-theme-success-lightest", ".bdr-theme-warning-dark", ".bdr-theme-warning-darker",
    ".bdr-theme-warning-darkest", ".bdr-theme-warning-default", ".bdr-theme-warning-light",
    ".bdr-theme-warning-lighter", ".bdr-theme-warning-lightest",
    ".bdr-trans-dark", ".bdr-trans-darker", ".bdr-trans-darkest", ".bdr-trans-default",
    ".bdr-trans-light", ".bdr-trans-lighter", ".bdr-trans-lightest", ".bdr-trans-rev-default",
    ".bdr-trans-rev-light", ".bdr-trans-rev-lighter", ".bdr-trans-rev-lightest",
    ".bdr-transparent",
    ".bdr-width-0", ".bdr-width-auto", ".bdr-width-default", ".bdr-width-lg", ".bdr-width-sm",
    ".bdr-width-xl", ".bdr-width-xs", ".bdr-width-xxl", ".bdr-width-xxs",
    ".bdt", ".bdt-color-dark", ".bdt-color-darker", ".bdt-color-default", ".bdt-color-light",
    ".bdt-color-lighter", ".bdt-none", ".bdt-radius-default", ".bdt-radius-lg", ".bdt-radius-sm",
    ".bdt-radius-xl", ".bdt-radius-xs", ".bdt-radius-xxl",
    ".bdt-theme-blue-gray-dark", ".bdt-theme-blue-gray-darker", ".bdt-theme-blue-gray-darkest",
    ".bdt-theme-blue-gray-default", ".bdt-theme-blue-gray-light", ".bdt-theme-blue-gray-lighter",
    ".bdt-theme-blue-gray-lightest", ".bdt-theme-danger-dark", ".bdt-theme-danger-darker",
    ".bdt-theme-danger-darkest", ".bdt-theme-danger-default", ".bdt-theme-danger-light",
    ".bdt-theme-danger-lighter", ".bdt-theme-danger-lightest", ".bdt-theme-gray-dark",
    ".bdt-theme-gray-darker", ".bdt-theme-gray-darkest", ".bdt-theme-gray-default",
    ".bdt-theme-gray-light", ".bdt-theme-gray-lighter", ".bdt-theme-gray-lightest",
    ".bdt-theme-info-dark", ".bdt-theme-info-darker", ".bdt-theme-info-darkest",
    ".bdt-theme-info-default", ".bdt-theme-info-light", ".bdt-theme-info-lighter",
    ".bdt-theme-info-lightest", ".bdt-theme-primary-dark", ".bdt-theme-primary-darker",
    ".bdt-theme-primary-darkest", ".bdt-theme-primary-default", ".bdt-theme-primary-light",
    ".bdt-theme-primary-lighter", ".bdt-theme-primary-lightest", ".bdt-theme-secondary-dark",
    ".bdt-theme-secondary-darker", ".bdt-theme-secondary-darkest", ".bdt-theme-secondary-default",
    ".bdt-theme-secondary-light", ".bdt-theme-secondary-lighter", ".bdt-theme-secondary-lightest",
    ".bdt-theme-success-dark", ".bdt-theme-success-darker", ".bdt-theme-success-darkest",
    ".bdt-theme-success-default", ".bdt-theme-success-light", ".bdt-theme-success-lighter",
    ".bdt-theme-success-lightest", ".bdt-theme-warning-dark", ".bdt-theme-warning-darker",
    ".bdt-theme-warning-darkest", ".bdt-theme-warning-default", ".bdt-theme-warning-light",
    ".bdt-theme-warning-lighter", ".bdt-theme-warning-lightest",
    ".bdt-trans-dark", ".bdt-trans-darker", ".bdt-trans-darkest", ".bdt-trans-default",
    ".bdt-trans-light", ".bdt-trans-lighter", ".bdt-trans-lightest", ".bdt-trans-rev-default",
    ".bdt-trans-rev-light", ".bdt-trans-rev-lighter", ".bdt-trans-rev-lightest",
    ".bdt-transparent",
    ".bdt-width-0", ".bdt-width-auto", ".bdt-width-default", ".bdt-width-lg", ".bdt-width-sm",
    ".bdt-width-xl", ".bdt-width-xs", ".bdt-width-xxl", ".bdt-width-xxs",
    ".block",
    ".bg-control", ".bg-default",
    ".bg-theme-blue-gray-dark", ".bg-theme-blue-gray-darker", ".bg-theme-blue-gray-darkest",
    ".bg-theme-blue-gray-default", ".bg-theme-blue-gray-light", ".bg-theme-blue-gray-lighter",
    ".bg-theme-blue-gray-lightest", ".bg-theme-danger-dark", ".bg-theme-danger-darker",
    ".bg-theme-danger-darkest", ".bg-theme-danger-default", ".bg-theme-danger-light",
    ".bg-theme-danger-lighter", ".bg-theme-danger-lightest", ".bg-theme-gray-dark",
    ".bg-theme-gray-darker", ".bg-theme-gray-darkest", ".bg-theme-gray-default",
    ".bg-theme-gray-light", ".bg-theme-gray-lighter", ".bg-theme-gray-lightest",
    ".bg-theme-info-dark", ".bg-theme-info-darker", ".bg-theme-info-darkest",
    ".bg-theme-info-default", ".bg-theme-info-light", ".bg-theme-info-lighter",
    ".bg-theme-info-lightest", ".bg-theme-primary-dark", ".bg-theme-primary-darker",
    ".bg-theme-primary-darkest", ".bg-theme-primary-default", ".bg-theme-primary-light",
    ".bg-theme-primary-lighter", ".bg-theme-primary-lightest", ".bg-theme-secondary-dark",
    ".bg-theme-secondary-darker", ".bg-theme-secondary-darkest", ".bg-theme-secondary-default",
    ".bg-theme-secondary-light", ".bg-theme-secondary-lighter", ".bg-theme-secondary-lightest",
    ".bg-theme-success-dark", ".bg-theme-success-darker", ".bg-theme-success-darkest",
    ".bg-theme-success-default", ".bg-theme-success-light", ".bg-theme-success-lighter",
    ".bg-theme-success-lightest", ".bg-theme-warning-dark", ".bg-theme-warning-darker",
    ".bg-theme-warning-darkest", ".bg-theme-warning-default", ".bg-theme-warning-light",
    ".bg-theme-warning-lighter", ".bg-theme-warning-lightest",
    ".bg-trans-dark", ".bg-trans-darker", ".bg-trans-darkest", ".bg-trans-default",
    ".bg-trans-light", ".bg-trans-lighter", ".bg-trans-lightest", ".bg-trans-rev-default",
    ".bg-trans-rev-light", ".bg-trans-rev-lighter", ".bg-trans-rev-lightest",
    ".control-header", ".cross-align-center", ".cross-align-end", ".cross-align-start",
    ".fill",
    ".form-control",
    ".ft-size-default", ".ft-size-h1", ".ft-size-h2", ".ft-size-h3", ".ft-size-h4",
    ".ft-size-h5", ".ft-size-h6", ".ft-size-lg", ".ft-size-sm",
    ".gap-0", ".gap-auto", ".gap-default", ".gap-lg", ".gap-sm", ".gap-xl", ".gap-xs",
    ".gap-xxl", ".gap-xxs",
    ".help",
    ".inline", ".inline-block",
    ".main-align-center", ".main-align-end", ".main-align-start",
    ".nowrap", ".overflow-auto",
    ".page-header", ".position-relative",
    ".sticky-top",
    ".sh-topbar", ".sw-sidebar",
    ".tx-center", ".tx-left", ".tx-line-through", ".tx-right", ".tx-underline",
    ".tx-theme-blue-gray-dark", ".tx-theme-blue-gray-darker", ".tx-theme-blue-gray-darkest",
    ".tx-theme-blue-gray-default", ".tx-theme-blue-gray-light", ".tx-theme-blue-gray-lighter",
    ".tx-theme-blue-gray-lightest", ".tx-theme-danger-dark", ".tx-theme-danger-darker",
    ".tx-theme-danger-darkest", ".tx-theme-danger-default", ".tx-theme-danger-light",
    ".tx-theme-danger-lighter", ".tx-theme-danger-lightest", ".tx-theme-gray-dark",
    ".tx-theme-gray-darker", ".tx-theme-gray-darkest", ".tx-theme-gray-default",
    ".tx-theme-gray-light", ".tx-theme-gray-lighter", ".tx-theme-gray-lightest",
    ".tx-theme-info-dark", ".tx-theme-info-darker", ".tx-theme-info-darkest",
    ".tx-theme-info-default", ".tx-theme-info-light", ".tx-theme-info-lighter",
    ".tx-theme-info-lightest", ".tx-theme-primary-dark", ".tx-theme-primary-darker",
    ".tx-theme-primary-darkest", ".tx-theme-primary-default", ".tx-theme-primary-light",
    ".tx-theme-primary-lighter", ".tx-theme-primary-lightest", ".tx-theme-secondary-dark",
    ".tx-theme-secondary-darker", ".tx-theme-secondary-darkest", ".tx-theme-secondary-default",
    ".tx-theme-secondary-light", ".tx-theme-secondary-lighter", ".tx-theme-secondary-lightest",
    ".tx-theme-success-dark", ".tx-theme-success-darker", ".tx-theme-success-darkest",
    ".tx-theme-success-default", ".tx-theme-success-light", ".tx-theme-success-lighter",
    ".tx-theme-success-lightest", ".tx-theme-warning-dark", ".tx-theme-warning-darker",
    ".tx-theme-warning-darkest", ".tx-theme-warning-default", ".tx-theme-warning-light",
    ".tx-theme-warning-lighter", ".tx-theme-warning-lightest",
    ".tx-trans-dark", ".tx-trans-default", ".tx-trans-light", ".tx-trans-lighter",
    ".tx-trans-lightest", ".tx-trans-rev-dark", ".tx-trans-rev-darker", ".tx-trans-rev-default",
    // controls: flex
    ".flex-auto", ".flex-column", ".flex-column-inline", ".flex-fill", ".flex-min",
    ".flex-row", ".flex-row-inline",
    // controls: grid
    ".grid",
    ".grid-1", ".grid-2", ".grid-3", ".grid-4", ".grid-5", ".grid-6",
    ".grid-7", ".grid-8", ".grid-9", ".grid-10", ".grid-11", ".grid-12",
    ".grid-sm-1", ".grid-sm-2", ".grid-sm-3", ".grid-sm-4", ".grid-sm-5", ".grid-sm-6",
    ".grid-sm-7", ".grid-sm-8", ".grid-sm-9", ".grid-sm-10", ".grid-sm-11", ".grid-sm-12",
    ".grid-xs-1", ".grid-xs-2", ".grid-xs-3", ".grid-xs-4", ".grid-xs-5", ".grid-xs-6",
    ".grid-xs-7", ".grid-xs-8", ".grid-xs-9", ".grid-xs-10", ".grid-xs-11", ".grid-xs-12",
    ".grid-xxs-1", ".grid-xxs-2", ".grid-xxs-3", ".grid-xxs-4", ".grid-xxs-5", ".grid-xxs-6",
    ".grid-xxs-7", ".grid-xxs-8", ".grid-xxs-9", ".grid-xxs-10", ".grid-xxs-11", ".grid-xxs-12",
    // controls: card, form-box, form-table, table, toast, busy
    ".card", ".form-box", ".form-box-inline", ".form-box-item",
    ".form-table", ".form-table-header",
    ".table", ".table-bd-h", ".table-bd-v", ".table-inline", ".table-inset",
  ];

  // gap 키 기반 동적 선택자 (p, m, pv, ph, mv, mh, sw, sh, pt, mt, t 등)
  const gapKeys = ["xxs", "xs", "sm", "default", "lg", "xl", "xxl", "0", "auto"];
  const gapSelectors: string[] = [];
  for (const key of gapKeys) {
    gapSelectors.push(
      `.p-${key}`, `.m-${key}`,
      `.pv-${key}`, `.ph-${key}`, `.mv-${key}`, `.mh-${key}`,
      `.sw-${key}`, `.sh-${key}`,
    );
    for (const d of ["t", "r", "b", "l"]) {
      gapSelectors.push(`.p${d}-${key}`, `.m${d}-${key}`, `.${d}-${key}`);
    }
    for (const key2 of gapKeys) {
      gapSelectors.push(`.p-${key}-${key2}`, `.m-${key}-${key2}`);
    }
  }
  const fullBaseline = new Set([...baselineSelectors, ...gapSelectors].sort());

  describe("Scenario: CSS 출력 동일성 검증", () => {
    it("리팩토링 후 유틸리티 클래스 선택자 집합이 기준선과 동일하다", () => {
      const newSelectors = extractClassSelectors(cssText);
      const newSet = new Set(newSelectors);

      // 기준선에 있지만 새 CSS에 없는 선택자
      const removed = [...fullBaseline].filter((s) => !newSet.has(s));
      expect(removed).toEqual([]);

      // 새 CSS에 있지만 기준선에 없는 선택자 (_styles.scss 유틸리티만 비교)
      const added = [...newSet].filter((s) => !fullBaseline.has(s));
      expect(added).toEqual([]);
    });
  });
});
