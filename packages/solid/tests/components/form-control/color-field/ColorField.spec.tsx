import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { ColorField } from "../../../../src/components/form-control/color-field/ColorField";

describe("ColorField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("input type=color가 렌더링된다", () => {
      const { container } = render(() => <ColorField />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe("color");
    });

    it("title이 input에 적용된다", () => {
      const { container } = render(() => <ColorField title="색상 선택" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.title).toBe("색상 선택");
    });
  });

  describe("값 변환 (#RRGGBB 형식)", () => {
    it("value prop이 #RRGGBB 형식으로 input에 표시된다", () => {
      const { container } = render(() => <ColorField value="#ff0000" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("#ff0000");
    });

    it("기본값은 #000000이다", () => {
      const { container } = render(() => <ColorField />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("#000000");
    });
  });

  describe("controlled 패턴", () => {
    it("onValueChange가 색상 변경 시 호출된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <ColorField value="#000000" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "#ff5500" } });

      expect(handleChange).toHaveBeenCalledWith("#ff5500");
    });

    it("외부 상태 변경 시 input 값이 업데이트된다", () => {
      const [value, setValue] = createSignal("#ff0000");
      const { container } = render(() => <ColorField value={value()} onValueChange={setValue} />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("#ff0000");

      setValue("#00ff00");
      expect(input.value).toBe("#00ff00");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => <ColorField value="#ff0000" />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("#ff0000");

      fireEvent.input(input, { target: { value: "#0000ff" } });
      expect(input.value).toBe("#0000ff");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <ColorField disabled value="#ff0000" />);
      const input = container.querySelector("input");
      const colorBox = container.querySelector("div.sd-color-field");

      expect(input).toBeFalsy();
      expect(colorBox).toBeTruthy();
    });

    it("disabled 상태에서 색상이 배경색으로 표시된다", () => {
      const { container } = render(() => <ColorField disabled value="#ff0000" />);
      const colorBox = container.querySelector("div.sd-color-field") as HTMLElement;
      // 색상 박스 내부에 색상이 표시되어야 함
      expect(colorBox).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <ColorField disabled value="#ff0000" />);
      const wrapper = container.querySelector("div.sd-color-field") as HTMLElement;
      expect(wrapper.classList.contains("bg-neutral-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <ColorField readonly value="#00ff00" />);
      const input = container.querySelector("input");
      const colorBox = container.querySelector("div.sd-color-field");

      expect(input).toBeFalsy();
      expect(colorBox).toBeTruthy();
    });

    it("readonly 상태에서 색상이 표시된다", () => {
      const { container } = render(() => <ColorField readonly value="#00ff00" />);
      const colorBox = container.querySelector("div.sd-color-field") as HTMLElement;
      expect(colorBox).toBeTruthy();
    });
  });

  describe("error 스타일", () => {
    it("error=true일 때 에러 스타일이 적용된다", () => {
      const { container } = render(() => <ColorField error />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-danger-500")).toBe(true);
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 사이즈가 적용된다", () => {
      const { container } = render(() => <ColorField size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("size-6")).toBe(true);
    });

    it("size=lg일 때 큰 사이즈가 적용된다", () => {
      const { container } = render(() => <ColorField size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("size-10")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없다", () => {
      const { container } = render(() => <ColorField inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-none")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <ColorField class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("기본 스타일", () => {
    it("기본 border 스타일이 적용된다", () => {
      const { container } = render(() => <ColorField />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border")).toBe(true);
      expect(wrapper.classList.contains("border-neutral-300")).toBe(true);
    });

    it("다크 모드 스타일이 적용된다", () => {
      const { container } = render(() => <ColorField />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-neutral-600")).toBe(true);
    });

    it("기본 사이즈는 size-8이다", () => {
      const { container } = render(() => <ColorField />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("size-8")).toBe(true);
    });
  });
});
