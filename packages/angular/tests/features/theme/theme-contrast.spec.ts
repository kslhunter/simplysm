import { afterAll, beforeAll, describe, expect, it } from "vitest";
import cssText from "../../../scss/commons/_theme-variables.scss?inline";
import { getWcagContrastRatio } from "@simplysm/angular";

//
// 테마별 핵심 fg/bg 쌍 WCAG 대비 게이트 (DEC-012)
// - 본문 텍스트 4.5:1, 대형/보조, UI 3:1.
// - 알파 값은 표면 합성 후 계산(getWcagContrastRatio 의 base).
// - 의도적 저대비(현행 디자인 값 보존 — RISK-001 값 불변 원칙)는 명시 예외 목록으로만 허용.
//

const THEMES = ["light", "blueprint", "ide-dark"] as const;

// [fg 토큰, bg 토큰, 최소 대비율]
const CORE_PAIRS: [string, string, number][] = [
  ["--sd-tx-default", "--sd-bg-canvas", 4.5],
  ["--sd-tx-default", "--sd-bg-content", 4.5],
  ["--sd-tx-default", "--sd-bg-elevated", 4.5],
  ["--sd-tx-default", "--sd-bg-field", 4.5],
  ["--sd-tx-muted", "--sd-bg-canvas", 3],
  ["--sd-tx-primary", "--sd-bg-canvas", 3],
  ["--sd-tx-primary-solid", "--sd-bg-primary-solid", 3],
  ["--sd-tx-danger-solid", "--sd-bg-danger-solid", 3],
  ["--sd-focus-ring-color", "--sd-bg-canvas", 3],
  ["--sd-modal-header-tx", "--sd-modal-header-bg", 4.5],
];

// 의도적 저대비 예외 — "테마명|fg|bg" (현행 테마 확정 값 보존이 사유일 때만 추가)
const EXCEPTIONS = new Set<string>([
  // 구 테마 확정 값 보존(값 불변 원칙) — danger solid = red-400 + 백색(2.89:1).
  // errorForeground(#f48771) 근사, 경고 원색 유지가 디자인 의도.
  "blueprint|--sd-tx-danger-solid|--sd-bg-danger-solid",
  "ide-dark|--sd-tx-danger-solid|--sd-bg-danger-solid",
]);

describe("테마 핵심 쌍 WCAG 대비 (DEC-012)", () => {
  let styleEl: HTMLStyleElement;

  beforeAll(() => {
    styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
  });

  afterAll(() => {
    styleEl.remove();
    document.body.className = "";
  });

  for (const theme of THEMES) {
    it(`${theme} 테마 전 쌍 통과`, () => {
      document.body.className = theme === "light" ? "" : `sd-theme-${theme}`;
      const computed = getComputedStyle(document.body);
      const canvas = computed.getPropertyValue("--sd-bg-canvas").trim();

      const failures: string[] = [];
      for (const [fg, bg, min] of CORE_PAIRS) {
        if (EXCEPTIONS.has(`${theme}|${fg}|${bg}`)) continue;
        const fgValue = computed.getPropertyValue(fg).trim();
        const bgValue = computed.getPropertyValue(bg).trim();
        // 표면 토큰이 반투명일 수 있으므로 캔버스를 최종 base 로 합성
        const ratio = getWcagContrastRatio(fgValue, bgValue, canvas);
        if (ratio < min) {
          failures.push(
            `${theme}: ${fg}(${fgValue}) on ${bg}(${bgValue}) = ${ratio.toFixed(2)} < ${min}`,
          );
        }
      }
      expect(failures).toEqual([]);
    });
  }
});
