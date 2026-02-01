import { describe, it, expect } from "vitest";
import { atoms } from "../../src/styles/atoms.css";

describe("atoms", () => {
  describe("display 속성", () => {
    it("display: flex를 적용한다", () => {
      const className = atoms({ display: "flex" });
      expect(className).toBeTruthy();
      expect(typeof className).toBe("string");
    });

    it("display: none을 적용한다", () => {
      const className = atoms({ display: "none" });
      expect(className).toBeTruthy();
    });

    it("display: grid를 적용한다", () => {
      const className = atoms({ display: "grid" });
      expect(className).toBeTruthy();
    });
  });

  describe("flex 속성", () => {
    it("flexDirection: column을 적용한다", () => {
      const className = atoms({ flexDirection: "column" });
      expect(className).toBeTruthy();
    });

    it("alignItems: center를 적용한다", () => {
      const className = atoms({ alignItems: "center" });
      expect(className).toBeTruthy();
    });

    it("justifyContent: space-between을 적용한다", () => {
      const className = atoms({ justifyContent: "space-between" });
      expect(className).toBeTruthy();
    });

    it("flexWrap: wrap을 적용한다", () => {
      const className = atoms({ flexWrap: "wrap" });
      expect(className).toBeTruthy();
    });
  });

  describe("spacing 속성", () => {
    it("gap 값을 적용한다", () => {
      const className = atoms({ gap: "sm" });
      expect(className).toBeTruthy();
    });

    it("padding shorthand (p)를 적용한다", () => {
      const className = atoms({ p: "lg" });
      expect(className).toBeTruthy();
    });

    it("padding-x shorthand (px)를 적용한다", () => {
      const className = atoms({ px: "base" });
      expect(className).toBeTruthy();
    });

    it("padding-y shorthand (py)를 적용한다", () => {
      const className = atoms({ py: "xs" });
      expect(className).toBeTruthy();
    });

    it("margin shorthand (m)를 적용한다", () => {
      const className = atoms({ m: "xl" });
      expect(className).toBeTruthy();
    });

    it("margin-x shorthand (mx)를 적용한다", () => {
      const className = atoms({ mx: "sm" });
      expect(className).toBeTruthy();
    });

    it("margin-y shorthand (my)를 적용한다", () => {
      const className = atoms({ my: "xxl" });
      expect(className).toBeTruthy();
    });
  });

  describe("복합 속성", () => {
    it("여러 속성을 동시에 적용한다", () => {
      const className = atoms({
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "base",
        p: "lg",
      });
      expect(className).toBeTruthy();
      // 여러 클래스가 공백으로 구분되어 있어야 함
      expect(className.split(" ").length).toBeGreaterThan(1);
    });

    it("flex 레이아웃과 spacing을 함께 적용한다", () => {
      const className = atoms({
        display: "flex",
        flexDirection: "column",
        gap: "sm",
        py: "xs",
        mx: "lg",
      });
      expect(className).toBeTruthy();
      expect(className.split(" ").length).toBeGreaterThan(1);
    });
  });

  describe("spacing 값 범위", () => {
    it("none 값을 적용한다", () => {
      const className = atoms({ gap: "none" });
      expect(className).toBeTruthy();
    });

    it("xxs 값을 적용한다", () => {
      const className = atoms({ gap: "xxs" });
      expect(className).toBeTruthy();
    });

    it("xxxl 값을 적용한다", () => {
      const className = atoms({ gap: "xxxl" });
      expect(className).toBeTruthy();
    });

    it("xxxxl 값을 적용한다", () => {
      const className = atoms({ gap: "xxxxl" });
      expect(className).toBeTruthy();
    });
  });

  describe("빈 객체", () => {
    it("빈 객체를 전달하면 빈 문자열을 반환한다", () => {
      const className = atoms({});
      expect(className).toBe("");
    });
  });

  describe("멱등성", () => {
    it("같은 속성값에 대해 같은 클래스명을 반환한다", () => {
      expect(atoms({ gap: "sm" })).toBe(atoms({ gap: "sm" }));
    });

    it("다른 spacing 값에 대해 다른 클래스명을 반환한다", () => {
      expect(atoms({ gap: "none" })).not.toBe(atoms({ gap: "sm" }));
      expect(atoms({ gap: "sm" })).not.toBe(atoms({ gap: "lg" }));
    });

    it("같은 복합 속성에 대해 같은 클래스명을 반환한다", () => {
      const props = { display: "flex", alignItems: "center", gap: "base" } as const;
      expect(atoms(props)).toBe(atoms(props));
    });
  });
});
