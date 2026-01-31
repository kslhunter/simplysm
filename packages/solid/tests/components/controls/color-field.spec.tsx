import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { ColorField } from "../../../src/components/controls/color-field";

describe("ColorField", () => {
  describe("기본 렌더링", () => {
    it("hex 색상값이 올바르게 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <ColorField value="#ff0000" onChange={onChange} />);

      const input = document.querySelector('input[type="color"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("#ff0000");
    });

    it("undefined 값은 기본값 #000000으로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <ColorField value={undefined} onChange={onChange} />);

      const input = document.querySelector('input[type="color"]') as HTMLInputElement;
      expect(input.value).toBe("#000000");
    });
  });

  describe("value/onChange 동작", () => {
    it("색상을 선택하면 hex string으로 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <ColorField value="#000000" onChange={onChange} />);

      const input = document.querySelector('input[type="color"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "#00ff00" } });

      expect(onChange).toHaveBeenCalledWith("#00ff00");
    });
  });

  describe("disabled/readonly 상태", () => {
    it("disabled 상태가 적용된다", () => {
      const onChange = vi.fn();
      render(() => <ColorField value="#000000" onChange={onChange} disabled />);

      const input = document.querySelector('input[type="color"]') as HTMLInputElement;
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute("aria-disabled", "true");
    });

    it("readOnly 상태가 적용된다", () => {
      const onChange = vi.fn();
      render(() => <ColorField value="#ff0000" onChange={onChange} readOnly />);

      const input = document.querySelector('input[type="color"]') as HTMLInputElement;
      expect(input).toHaveAttribute("readonly");
      expect(input).toHaveAttribute("aria-readonly", "true");
    });
  });
});
