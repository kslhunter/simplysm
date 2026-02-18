import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { ColorPicker } from "../../../../src/components/form-control/color-picker/ColorPicker";

describe("ColorPicker 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("input type=color가 렌더링된다", () => {
      const { container } = render(() => <ColorPicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("color");
    });

    it("기본값은 #000000이다", () => {
      const { container } = render(() => <ColorPicker />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("#000000");
    });
  });

  describe("controlled 패턴", () => {
    it("onValueChange가 색상 변경 시 호출된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <ColorPicker value="#000000" onValueChange={handleChange} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "#ff5500" } });

      expect(handleChange).toHaveBeenCalledWith("#ff5500");
    });

    it("외부 상태 변경 시 input 값이 업데이트된다", () => {
      const [value, setValue] = createSignal("#ff0000");
      const { container } = render(() => <ColorPicker value={value()} onValueChange={setValue} />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("#ff0000");

      setValue("#00ff00");
      expect(input.value).toBe("#00ff00");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 input이 비활성화된다", () => {
      const { container } = render(() => <ColorPicker disabled />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <ColorPicker disabled />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.classList.contains("cursor-default")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <ColorPicker class="my-custom-class" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.classList.contains("my-custom-class")).toBe(true);
    });
  });
});
