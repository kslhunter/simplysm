import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Barcode } from "../../../src/components/display/Barcode";

describe("Barcode", () => {
  describe("basic rendering", () => {
    it("renders SVG when value is provided", () => {
      const { container } = render(() => <Barcode type="qrcode" value="hello" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.querySelector("svg")).toBeTruthy();
    });

    it("renders empty when value is absent", () => {
      const { container } = render(() => <Barcode type="qrcode" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.innerHTML).toBe("");
    });
  });

  describe("reactivity", () => {
    it("updates SVG when value changes", () => {
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

    it("removes SVG when value changes to empty string", () => {
      const [value, setValue] = createSignal("hello");
      const { container } = render(() => <Barcode type="qrcode" value={value()} />);
      const el = container.querySelector("[data-barcode]")!;

      expect(el.querySelector("svg")).toBeTruthy();

      setValue("");
      expect(el.innerHTML).toBe("");
    });
  });
});
