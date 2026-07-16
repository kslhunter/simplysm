import { describe, expect, it } from "vitest";
import { getWcagContrastRatio } from "@simplysm/angular";

//
// WCAG 대비율 유틸 (DEC-012) — 커스텀 테마 검증용 공개 export
//

describe("getWcagContrastRatio", () => {
  it("흑백 최대 대비는 21:1", () => {
    expect(getWcagContrastRatio("black", "white")).toBeCloseTo(21, 1);
    expect(getWcagContrastRatio("white", "black")).toBeCloseTo(21, 1);
  });

  it("동일 색은 1:1", () => {
    expect(getWcagContrastRatio("rgb(128, 128, 128)", "rgb(128, 128, 128)")).toBeCloseTo(1, 5);
  });

  it("rgb 리터럴 — WCAG 기준값과 일치 (white vs #767676 = 4.54:1)", () => {
    expect(getWcagContrastRatio("rgb(118, 118, 118)", "white")).toBeCloseTo(4.54, 2);
  });

  it("hex 표기 파싱", () => {
    expect(getWcagContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(getWcagContrastRatio("#fff", "#000")).toBeCloseTo(21, 1);
  });

  it("알파 전경은 배경 위에 합성 후 계산 (rgba 검정 0.87 on white)", () => {
    // 0.87 black on white = rgb(33,33,33) — 대비 약 15.9:1
    const ratio = getWcagContrastRatio("rgba(0, 0, 0, 0.87)", "white");
    expect(ratio).toBeCloseTo(getWcagContrastRatio("rgb(33, 33, 33)", "white"), 1);
  });

  it("반투명 배경은 base 위에 합성 후 계산", () => {
    // 배경 rgba(0,0,0,0.5) on white = rgb(128,128,128) 근사
    const composed = getWcagContrastRatio("white", "rgba(0, 0, 0, 0.5)", "white");
    const direct = getWcagContrastRatio("white", "rgb(128, 128, 128)");
    expect(composed).toBeCloseTo(direct, 1);
  });

  it("파싱 불가 색은 throw (silent skip 금지)", () => {
    expect(() => getWcagContrastRatio("blurple", "white")).toThrow();
    expect(() => getWcagContrastRatio("", "white")).toThrow();
  });

  it("base 없는 반투명 배경은 throw", () => {
    expect(() => getWcagContrastRatio("white", "rgba(0, 0, 0, 0.5)")).toThrow();
  });
});
