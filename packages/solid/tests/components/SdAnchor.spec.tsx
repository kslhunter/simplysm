import { describe, it, expect } from "vitest";
import { anchorVariants } from "../../src/components/SdAnchor";

describe("anchorVariants", () => {
  it("기본 스타일 적용", () => {
    const result = anchorVariants();

    expect(result).toContain("inline");
    expect(result).toContain("cursor-pointer");
    expect(result).toContain("transition-colors");
  });

  it("기본 테마 primary", () => {
    const result = anchorVariants();

    expect(result).toContain("text-primary");
    expect(result).toContain("hover:text-text-primary-hover");
    expect(result).toContain("hover:underline");
  });

  const themes = ["primary", "secondary", "info", "success", "warning", "danger", "gray", "slate"] as const;

  themes.forEach((theme) => {
    it(`테마 ${theme} 적용`, () => {
      const result = anchorVariants({ theme });

      expect(result).toContain(`text-${theme}`);
    });
  });

  it("disabled 상태", () => {
    const result = anchorVariants({ disabled: true });

    expect(result).toContain("pointer-events-none");
    expect(result).toContain("opacity-30");
    expect(result).toContain("cursor-not-allowed");
  });

  it("커스텀 class 병합", () => {
    const result = anchorVariants({ class: "custom-class" });

    expect(result).toContain("custom-class");
    expect(result).toContain("text-primary");
  });

  it("theme + disabled 조합", () => {
    const result = anchorVariants({ theme: "danger", disabled: true });

    expect(result).toContain("text-danger");
    expect(result).toContain("pointer-events-none");
  });
});
