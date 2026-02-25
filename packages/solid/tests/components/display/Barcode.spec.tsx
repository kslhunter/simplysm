import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Barcode } from "../../../src/components/display/Barcode";

describe("Barcode 컴포넌트", () => {
  describe("basic rendering", () => {
    it("data-barcode 속성으로 렌더링된다", () => {
      const { container } = render(() => <Barcode type="qrcode" value="test" />);
      expect(container.querySelector("[data-barcode]")).toBeTruthy();
    });

    it("value가 있으면 SVG가 렌더링된다", () => {
      const { container } = render(() => <Barcode type="qrcode" value="hello" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.querySelector("svg")).toBeTruthy();
    });

    it("value가 없으면 내용이 비어있다", () => {
      const { container } = render(() => <Barcode type="qrcode" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.innerHTML).toBe("");
    });
  });

  describe("반응성", () => {
    it("value 변경 시 SVG가 업데이트된다", () => {
      const [value, setValue] = createSignal("first");
      const { container } = render(() => <Barcode type="qrcode" value={value()} />);
      const el = container.querySelector("[data-barcode]")!;

      const firstSvg = el.innerHTML;
      setValue("second");
      const secondSvg = el.innerHTML;

      expect(firstSvg).not.toBe("");
      expect(secondSvg).not.toBe("");
      expect(firstSvg).not.toBe(secondSvg);
    });

    it("value가 빈 문자열로 변경되면 SVG가 제거된다", () => {
      const [value, setValue] = createSignal("hello");
      const { container } = render(() => <Barcode type="qrcode" value={value()} />);
      const el = container.querySelector("[data-barcode]")!;

      expect(el.querySelector("svg")).toBeTruthy();

      setValue("");
      expect(el.innerHTML).toBe("");
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Barcode type="qrcode" value="test" class="my-custom" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.classList.contains("my-custom")).toBe(true);
    });
  });
});
