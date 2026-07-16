import { afterAll, beforeAll, describe, expect, it } from "vitest";
import cssText from "../../../scss/commons/_theme-variables.scss?inline";

//
// --sd-* 역할 토큰 카탈로그 발행 검증
// - 카탈로그 키 전수가 :root 에 발행되는지 (누락 = 테마 값 맵이 덮을 대상이 없는 결함)
// - 체이닝 금지 규칙: --sd-* 토큰의 var() 참조는 팔레트(--sd-color-*, 테마 불변)만 허용
//

const PALETTE_HUES = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
];
const PALETTE_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

const SEMANTIC_KEYS = [
  "gray",
  "blue-gray",
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "danger",
];

const CATALOG_TOKENS = [
  // bg — 표면·필드
  ...[
    "canvas",
    "canvas-image",
    "control",
    "elevated",
    "overlay",
    "sheet",
    "sheet-image",
    "inverse",
    "field",
    "track",
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

  it("팔레트 --sd-color-{hue}-{step} 전수 발행", () => {
    const computed = getComputedStyle(document.documentElement);
    const missing = PALETTE_HUES.flatMap((hue) =>
      PALETTE_STEPS.map((step) => `--sd-color-${hue}-${step}`),
    ).filter((name) => computed.getPropertyValue(name).trim() === "");
    expect(missing).toEqual([]);
  });

  it("구 스케일 어휘가 발행되지 않는다 (14.2 브레이킹 — AC-004)", () => {
    const computed = getComputedStyle(document.documentElement);
    const oldTokens = [
      "--color-zinc-50",
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

  it("테마 클래스가 역할 토큰 값 맵을 덮는다 (테마 = 값 맵)", () => {
    const cases: [string, string, string][] = [
      // [테마 클래스, 토큰, 기대값(팔레트 토큰 계산값)]
      ["sd-theme-ide-dark", "--sd-bg-canvas", "--sd-color-zinc-950"],
      ["sd-theme-ide-dark", "--sd-bg-elevated", "--sd-color-zinc-800"],
      ["sd-theme-blueprint", "--sd-bg-primary-solid", "--sd-color-blue-900"],
    ];
    const rootComputed = getComputedStyle(document.documentElement);
    try {
      for (const [themeClass, token, paletteToken] of cases) {
        document.body.className = themeClass;
        const actual = getComputedStyle(document.body).getPropertyValue(token).trim();
        expect(actual, `${themeClass} ${token}`).toBe(
          rootComputed.getPropertyValue(paletteToken).trim(),
        );
      }
    } finally {
      document.body.className = "";
    }
  });

  it("밀도 축 — sd-density-compact 는 치수만 덮고, 테마는 치수를 덮지 않는다 (DEC-007)", () => {
    const dimensionTokens = [
      "--sd-gap-default",
      "--sd-line-height",
      "--sd-sheet-pv",
      "--sd-topbar-height",
    ];
    const baseValues = dimensionTokens.map((t) =>
      getComputedStyle(document.body).getPropertyValue(t).trim(),
    );
    try {
      // 테마는 치수 불변
      for (const themeClass of ["sd-theme-ide-dark", "sd-theme-blueprint"]) {
        document.body.className = themeClass;
        const computed = getComputedStyle(document.body);
        dimensionTokens.forEach((t, i) => {
          expect(computed.getPropertyValue(t).trim(), `${themeClass} ${t}`).toBe(baseValues[i]);
        });
      }
      // compact 는 치수를 덮음
      document.body.className = "sd-density-compact";
      const compact = getComputedStyle(document.body);
      expect(compact.getPropertyValue("--sd-gap-default").trim()).toBe("0.3333rem");
      expect(compact.getPropertyValue("--sd-line-height").trim()).toBe("1.35em");
      expect(compact.getPropertyValue("--sd-sheet-pv").trim()).toBe("0.0833rem");
      expect(compact.getPropertyValue("--sd-topbar-height").trim()).toBe("2rem");
    } finally {
      document.body.className = "";
    }
  });

  it("--sd-* 토큰의 var() 참조는 팔레트(--sd-color-*)만 허용 (체이닝 금지)", () => {
    const decls = cssText.match(/--sd-[a-z0-9-]+:[^;]+;/g) ?? [];
    expect(decls.length).toBeGreaterThan(0);

    const violations = decls.filter((decl) => {
      const value = decl.slice(decl.indexOf(":") + 1);
      const refs = value.match(/var\(\s*(--[a-z0-9-]+)/g) ?? [];
      return refs.some((ref) => !/var\(\s*--sd-color-/.test(ref));
    });
    expect(violations).toEqual([]);
  });
});
