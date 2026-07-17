import { describe, expect, it } from "vitest";
import cssText from "../../../scss/commons/_styles.scss?inline";

//
// 역할 기반 유틸 클래스 검증 (DEC-013)
// - 유틸 클래스명 = 토큰명에서 --sd- 만 뗀 것 (완전 1:1 어휘).
// - bg/tx/bd 색 토큰 전수 기계 생성. 단 -hover 변형·bg-canvas-image 는 미생성.
// - 방향 보더 변형은 .bd{t,r,b,l}-… 로 동일 어휘 재생성.
// - 구 유틸 어휘(.bg-theme-* 등)는 deprecated alias 파일 전용 — 여기 없어야 함.
//

const SEMANTIC_KEYS = ["gray", "blue-gray", "primary", "info", "success", "warning", "danger"];

// 카탈로그 색 토큰(-hover 변형·canvas-image 제외) — 클래스명 = 토큰명 - "--sd-"
const BG_CLASSES = [
  ...[
    "canvas",
    "content",
    "elevated",
    "overlay",
    "sheet",
    "inverse",
    "field",
    "track",
    "knob",
    "checkbox",
    "drop-target",
  ].map((k) => `bg-${k}`),
  ...SEMANTIC_KEYS.flatMap((k) => [`bg-${k}-solid`, `bg-${k}-subtle`]),
  "bg-state-active",
  "bg-state-selected",
  "bg-disabled",
  "bg-busy-overlay",
  "bg-busy-indicator",
  "bg-backdrop",
];

const TX_CLASSES = [
  ...[
    "strong",
    "default",
    "muted",
    "faint",
    "on-inverse",
    "on-inverse-muted",
    "on-inverse-disabled",
    "disabled",
  ].map((k) => `tx-${k}`),
  ...SEMANTIC_KEYS.flatMap((k) => [`tx-${k}`, `tx-${k}-solid`, `tx-${k}-subtle`]),
];

const BD_CLASSES = [
  ...["hairline", "soft", "default", "strong", "emphasis", "field", "disabled"].map(
    (k) => `bd-${k}`,
  ),
  ...SEMANTIC_KEYS.flatMap((k) => [`bd-${k}-solid`, `bd-${k}-subtle`]),
];

function findBlock(className: string): string | undefined {
  const re = new RegExp(`\\.${className}(?![\\w-])[^{}]*\\{([^}]*)\\}`);
  return re.exec(cssText)?.[1];
}

describe("역할 기반 유틸 클래스 (DEC-013)", () => {
  it("bg 색 토큰 전수의 .bg-* 클래스가 background-color 로 생성된다", () => {
    const missing = BG_CLASSES.filter((cls) => {
      const block = findBlock(cls);
      return block == null || !block.includes(`background-color: var(--sd-${cls})`);
    });
    expect(missing).toEqual([]);
  });

  it("tx 색 토큰 전수의 .tx-* 클래스가 color 로 생성된다", () => {
    const missing = TX_CLASSES.filter((cls) => {
      const block = findBlock(cls);
      return block == null || !block.includes(`color: var(--sd-${cls})`);
    });
    expect(missing).toEqual([]);
  });

  it("bd 색 토큰 전수의 .bd-* 클래스가 border-color 로 생성된다", () => {
    const missing = BD_CLASSES.filter((cls) => {
      const block = findBlock(cls);
      return block == null || !block.includes(`border-color: var(--sd-${cls})`);
    });
    expect(missing).toEqual([]);
  });

  it("bd 색 토큰 전수의 방향 변형 .bd{t,r,b,l}-* 클래스가 생성된다", () => {
    const missing: string[] = [];
    for (const cls of BD_CLASSES) {
      for (const [d, dir] of [
        ["t", "top"],
        ["r", "right"],
        ["b", "bottom"],
        ["l", "left"],
      ]) {
        const dirCls = cls.replace(/^bd-/, `bd${d}-`);
        const block = findBlock(dirCls);
        if (block == null || !block.includes(`border-${dir}-color: var(--sd-${cls})`)) {
          missing.push(dirCls);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("-hover 변형·bg-canvas-image·bg-sheet-image 클래스는 생성하지 않는다", () => {
    const forbidden = [
      "bg-canvas-image",
      "bg-sheet-image",
      "bg-state-hover",
      // control 삭제(surface 면 분리)
      "bg-control",
      ...SEMANTIC_KEYS.flatMap((k) => [
        `bg-${k}-solid-hover`,
        `bg-${k}-subtle-hover`,
        `tx-${k}-hover`,
        `bd-${k}-solid-hover`,
      ]),
    ];
    const present = forbidden.filter((cls) => new RegExp(`\\.${cls}(?![\\w-])`).test(cssText));
    expect(present).toEqual([]);
  });

  it("비색상 유틸은 클래스명을 유지하고 --sd-* 토큰만 참조한다 (계열별 대표)", () => {
    const cases: [string, string][] = [
      ["p-sm", "padding: var(--sd-gap-sm)"],
      ["m-default", "margin: var(--sd-gap-default)"],
      ["pt-xs", "padding-top: var(--sd-gap-xs)"],
      ["gap-sm", "gap: var(--sd-gap-sm)"],
      ["bd-radius-default", "border-radius: var(--sd-radius-default)"],
      ["bd-width-xxs", "border-width: var(--sd-gap-xxs)"],
      ["ft-size-h1", "font-size: var(--sd-font-size-h1)"],
      ["sh-topbar", "height: var(--sd-topbar-height)"],
      ["sw-sidebar", "width: var(--sd-sidebar-width)"],
    ];
    const missing = cases.filter(([cls, decl]) => {
      const block = findBlock(cls);
      return block == null || !block.includes(decl);
    });
    expect(missing.map(([cls]) => cls)).toEqual([]);
  });

  it("구 유틸 어휘(.bg-theme-*·.tx-trans-* 등)는 생성하지 않는다 (alias 파일 전용)", () => {
    const oldPatterns = [
      /\.bg-theme-/,
      /\.bg-trans-/,
      /\.bg-default(?![\w-])/,
      /\.tx-trans-/,
      /\.tx-theme-/,
      /\.bd[trbl]?-theme-/,
      /\.bd[trbl]?-trans-/,
      /\.bd[trbl]?-color-/,
    ];
    const present = oldPatterns.filter((p) => p.test(cssText));
    expect(present).toEqual([]);
  });
});
