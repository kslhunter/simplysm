import { afterAll, beforeAll, describe, expect, it } from "vitest";
import cssText from "../../../scss/commons/_theme-variables.scss?inline";

//
// --sd-* 역할 토큰 카탈로그 발행 검증 (불변식만 — 스타일 값 스냅샷 단언 금지)
// - 카탈로그 키 전수가 :root 에 발행되는지 (누락 = 테마 값 맵이 덮을 대상이 없는 결함)
// - 구 스케일 어휘(팔레트 포함)가 발행되지 않는지 (브레이킹 보장)
//

const SEMANTIC_KEYS = ["gray", "blue-gray", "primary", "info", "success", "warning", "danger"];

const CATALOG_TOKENS = [
  // bg — 표면·필드
  ...[
    "canvas",
    "canvas-image",
    "content",
    "elevated",
    "overlay",
    "sheet",
    "sheet-image",
    "inverse",
    "field",
    "track",
    "knob",
    "checkbox",
    "drop-target",
  ].map((k) => `bg-${k}`),
  // 시맨틱 슬롯 — 속성 우선(DEC-013): bg/tx/bd × solid/subtle(+hover), tx 단독(+hover)
  ...SEMANTIC_KEYS.flatMap((k) => [
    `bg-${k}-solid`,
    `bg-${k}-solid-hover`,
    `bg-${k}-subtle`,
    `bg-${k}-subtle-hover`,
    `tx-${k}`,
    `tx-${k}-hover`,
    `tx-${k}-solid`,
    `tx-${k}-subtle`,
    `bd-${k}-solid`,
    `bd-${k}-solid-hover`,
    `bd-${k}-subtle`,
  ]),
  // bg — 상태 오버레이·비활성·busy
  "bg-state-hover",
  "bg-state-active",
  "bg-state-selected",
  "bg-state-selected-inactive",
  "bg-disabled",
  "bg-busy-overlay",
  "bg-busy-indicator",
  "bg-backdrop",
  // tx
  "tx-strong",
  "tx-default",
  "tx-muted",
  "tx-faint",
  "tx-on-inverse",
  "tx-on-inverse-muted",
  "tx-on-inverse-disabled",
  "tx-disabled",
  // bd
  "bd-hairline",
  "bd-soft",
  "bd-default",
  "bd-strong",
  "bd-emphasis",
  "bd-field",
  "bd-disabled",
  "focus-ring-color",
  "focus-ring-width",
  "focus-ring-offset",
  "scrollbar-thumb",
  "scrollbar-thumb-hover",
  "scrollbar-track",
  "shadow-color",
  "shadow-size",
  "shadow-blur-mult",
  // 컴포넌트 장식 토큰 (방침 1, 2026-07-16)
  "card-bd",
  "card-bd-active",
  "card-shadow",
  "card-shadow-hover",
  "modal-bd",
  "modal-header-bg",
  "modal-header-tx",
  "modal-header-tx-muted",
  "dropdown-bd",
  "sheet-shadow",
  "permission-group-bg",
  "permission-group-tx",
  ...["sm", "default", "lg", "h1", "h2", "h3", "h4", "h5", "h6"].map((k) => `font-size-${k}`),
  "font-family",
  "font-family-field",
  "font-family-monospace",
  "font-weight",
  ...["xs", "sm", "default", "lg", "xl", "xxl"].map((k) => `radius-${k}`),
  // 밀도 그룹
  ...["xxs", "xs", "sm", "default", "lg", "xl", "xxl", "0", "auto"].map((k) => `gap-${k}`),
  "line-height",
  "line-height-strip-unit",
  "sheet-pv",
  "sheet-ph",
  "topbar-height",
  "sidebar-width",
  ...["toast", "busy", "dropdown", "modal", "sidebar"].map((k) => `z-${k}`),
  "animation-duration",
];

describe("--sd-* 역할 토큰 카탈로그 발행", () => {
  let styleEl: HTMLStyleElement;

  beforeAll(() => {
    styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
  });

  afterAll(() => {
    styleEl.remove();
  });

  it("구 스케일 어휘가 발행되지 않는다 (브레이킹 — AC-004)", () => {
    const computed = getComputedStyle(document.documentElement);
    const oldTokens = [
      "--color-zinc-50",
      "--sd-color-zinc-50",
      "--theme-gray-lightest",
      "--trans-default",
      "--text-trans-default",
      "--gap-default",
      "--font-size-default",
      "--border-radius-default",
      "--border-color-default",
      "--z-index-modal",
      "--background-color",
      "--control-color",
      "--busy-overlay-bg",
      // control 삭제(surface 면 분리) — content/checkbox 등으로 대체됨
      "--sd-bg-control",
    ];
    const published = oldTokens.filter((name) => computed.getPropertyValue(name).trim() !== "");
    expect(published).toEqual([]);
  });

  it("역할 토큰 카탈로그 키 전수 발행", () => {
    const computed = getComputedStyle(document.documentElement);
    const missing = CATALOG_TOKENS.map((k) => `--sd-${k}`).filter(
      (name) => computed.getPropertyValue(name).trim() === "",
    );
    expect(missing).toEqual([]);
  });
});
