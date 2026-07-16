import { describe, expect, it } from "vitest";
import { server } from "vitest/browser";

//
// 역할 토큰 소비 순도 검증 (AC-002)
// - src·scss(controls·commons 소비부)는 --sd-* 역할 토큰만 소비한다.
// - 구 스케일 어휘 var() 참조·rgb()/rgba() 색 리터럴·background 단축 소비를 금지한다.
// - 발행부(_variables.scss·_colors.scss·_theme-variables.scss·themes/**)는 팔레트·역할 토큰
//   정의부라 스캔 대상이 아니다. 구 어휘 발행은 14.2 에서 제거됨(부재 단언은 sd-tokens.spec).
//
// 파일 열거는 lazy import.meta.glob 의 키로만 하고(모듈 로드 없음),
// 원문은 vitest 서버측 readFile 로 읽는다(vite 변환 파이프라인 우회).
//

const srcPaths = Object.keys(import.meta.glob("/packages/angular/src/**/*.ts"));
const scssPaths = Object.keys(
  import.meta.glob([
    "/packages/angular/scss/styles.scss",
    "/packages/angular/scss/controls/*.scss",
    "/packages/angular/scss/commons/_styles.scss",
    "/packages/angular/scss/commons/_mixins.scss",
  ]),
);

async function readFiles(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const path of paths) {
    result.set(path, await server.commands.readFile(path.slice(1), { encoding: "utf-8" }));
  }
  return result;
}

const srcFiles = await readFiles(srcPaths);
const scssFiles = await readFiles(scssPaths);

const SKIP_FILES: string[] = [];

// 색 리터럴 허용처
const LITERAL_ALLOWED = [
  // 스타일시트 로드 실패 시에도 표시돼야 하는 최종 오류 오버레이(테마 무관)
  "src/core/error-handler/sd-global-error-handler.plugin.ts",
];

// background 단축 허용처
const SHORTHAND_ALLOWED = [
  // 인쇄면은 테마 무관 고정 백색 + 배경 패턴 리셋(의도적 단축)
  "src/core/print/sd-print.provider.ts",
];

const OLD_TOKEN_PATTERNS = [
  /var\(--theme-/,
  /var\(--trans-/,
  /var\(--text-trans-/,
  /var\(--color-/,
  /var\(--gap-/,
  /var\(--font-size-/,
  /var\(--font-family/,
  /var\(--font-weight/,
  /var\(--line-height/,
  /var\(--border-radius-/,
  /var\(--border-color-/,
  /var\(--background-color/,
  /var\(--background-rev-color/,
  /var\(--control-color/,
  /var\(--busy-overlay-bg/,
  /var\(--animation-duration\)/,
  /var\(--elevation-/,
  /var\(--z-index-/,
  /var\(--topbar-height/,
  /var\(--sidebar-width/,
  /var\(--sheet-/,
];

function findViolations(
  files: Map<string, string>,
  patterns: RegExp[],
  skipFiles: string[] = [],
): string[] {
  const violations: string[] = [];
  for (const [path, content] of files) {
    if (skipFiles.some((skip) => path.endsWith(skip))) continue;
    for (const pattern of patterns) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${path}:${i + 1}: ${lines[i].trim()}`);
        }
      }
    }
  }
  return violations;
}

describe("역할 토큰 소비 순도 (AC-002)", () => {
  it("src 는 구 스케일 토큰을 소비하지 않는다", () => {
    expect(findViolations(srcFiles, OLD_TOKEN_PATTERNS, SKIP_FILES)).toEqual([]);
  });

  it("scss 소비부는 구 스케일 토큰을 소비하지 않는다", () => {
    expect(findViolations(scssFiles, OLD_TOKEN_PATTERNS)).toEqual([]);
  });

  it("src 는 rgb()/rgba() 색 리터럴을 사용하지 않는다", () => {
    expect(findViolations(srcFiles, [/rgba?\(/], [...SKIP_FILES, ...LITERAL_ALLOWED])).toEqual([]);
  });

  it("scss 소비부는 rgb()/rgba() 색 리터럴을 사용하지 않는다", () => {
    expect(findViolations(scssFiles, [/rgba?\(/])).toEqual([]);
  });

  it("src 는 구 유틸 클래스를 소비하지 않는다 (템플릿 class 포함)", () => {
    const oldClassPatterns = [
      /\b(?:bg|tx|bd[trbl]?)-theme-/,
      /\b(?:bg|tx|bd[trbl]?)-trans-/,
      /\bbd[trbl]?-color-/,
      /\bbg-default\b/,
    ];
    expect(findViolations(srcFiles, oldClassPatterns, SKIP_FILES)).toEqual([]);
  });

  it("background 단축 속성을 사용하지 않는다 (DEC-006 — background-color 로 통일)", () => {
    const pattern = /(?<![-\w"[])background\s*:/;
    expect(findViolations(srcFiles, [pattern], [...SKIP_FILES, ...SHORTHAND_ALLOWED])).toEqual([]);
    expect(findViolations(scssFiles, [pattern])).toEqual([]);
  });
});
