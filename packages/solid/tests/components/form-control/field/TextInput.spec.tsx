import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { TextInput } from "../../../../src/components/form-control/field/TextInput";

describe("TextInput 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("input 요소가 렌더링된다", () => {
      const { container } = render(() => <TextInput />);
      const input = container.querySelector("input");
      expect(input).toBeTruthy();
    });

    it("기본 type은 text이다", () => {
      const { container } = render(() => <TextInput />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("text");
    });

    it("type=password일 때 password input이 렌더링된다", () => {
      const { container } = render(() => <TextInput type="password" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("password");
    });

    it("type=email일 때 email input이 렌더링된다", () => {
      const { container } = render(() => <TextInput type="email" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("email");
    });

    it("placeholder가 input에 적용된다", () => {
      const { container } = render(() => <TextInput placeholder="Enter text" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.placeholder).toBe("Enter text");
    });

    it("title이 input에 적용된다", () => {
      const { container } = render(() => <TextInput title="Input title" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.title).toBe("Input title");
    });

    it("autocomplete가 input에 적용된다", () => {
      const { container } = render(() => <TextInput autocomplete="email" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.autocomplete).toBe("email");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 input의 값으로 표시된다", () => {
      const { container } = render(() => <TextInput value="Hello" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("Hello");
    });

    it("onValueChange가 입력 시 호출된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <TextInput value="" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "Test" } });

      expect(handleChange).toHaveBeenCalledWith("Test");
    });

    it("외부 상태 변경 시 input 값이 업데이트된다", () => {
      const [value, setValue] = createSignal("Initial");
      const { container } = render(() => <TextInput value={value()} onValueChange={setValue} />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("Initial");

      setValue("Updated");
      expect(input.value).toBe("Updated");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => <TextInput value="Initial" />);
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input.value).toBe("Initial");

      fireEvent.input(input, { target: { value: "Changed" } });
      expect(input.value).toBe("Changed");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <TextInput disabled value="Disabled text" />);
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-text-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <TextInput disabled value="Disabled text" />);
      expect(getByText("Disabled text")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <TextInput disabled value="Text" />);
      const div = container.querySelector("div.sd-text-field") as HTMLElement;
      expect(div.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 div로 렌더링된다", () => {
      const { container } = render(() => <TextInput readonly value="Readonly text" />);
      const input = container.querySelector("input");
      const div = container.querySelector("div.sd-text-field");

      expect(input).toBeFalsy();
      expect(div).toBeTruthy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <TextInput readonly value="Readonly text" />);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("format 옵션", () => {
    it("format이 적용되어 표시된다", () => {
      const { container } = render(() => <TextInput format="XXX-XXXX-XXXX" value="01012345678" />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("010-1234-5678");
    });

    it("format이 적용된 상태에서 입력 시 원본 값이 onValueChange로 전달된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <TextInput format="XXX-XXXX-XXXX" value="" onValueChange={handleChange} />);
      const input = container.querySelector("input") as HTMLInputElement;

      fireEvent.input(input, { target: { value: "010-1234-5678" } });

      // 포맷 문자('-')가 제거된 원본 값이 전달됨
      expect(handleChange).toHaveBeenCalledWith("01012345678");
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <TextInput size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <TextInput size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 inset 배경색이 적용된다", () => {
      const { container } = render(() => <TextInput inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-none")).toBe(true);
      expect(wrapper.classList.contains("bg-primary-50")).toBe(true);
    });

    it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
      const { container } = render(() => <TextInput inset readonly value="Hello" />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toBe("Hello");

      const input = outer.querySelector("input");
      expect(input).toBeFalsy();
    });

    it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
      const { container } = render(() => <TextInput inset value="Hello" />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const input = outer.querySelector("input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe("Hello");
    });

    it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
      const { container } = render(() => <TextInput inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toBe("\u00A0");
    });

    it("inset + readonly ↔ editable 전환 시 content div가 항상 DOM에 존재한다", () => {
      const [readonly, setReadonly] = createSignal(true);
      const { container } = render(() => <TextInput inset readonly={readonly()} value="Test" />);
      const outer = container.firstChild as HTMLElement;

      let contentDiv = outer.querySelector("[data-text-field-content]");
      expect(contentDiv).toBeTruthy();
      expect(outer.querySelector("input")).toBeFalsy();

      setReadonly(false);
      contentDiv = outer.querySelector("[data-text-field-content]");
      expect(contentDiv).toBeTruthy();
      expect(outer.querySelector("input")).toBeTruthy();
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <TextInput class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("기본 스타일", () => {
    it("기본 border 스타일이 적용된다", () => {
      const { container } = render(() => <TextInput />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border")).toBe(true);
      expect(wrapper.classList.contains("border-base-300")).toBe(true);
    });

    it("focus 시 border 색상이 변경된다", () => {
      const { container } = render(() => <TextInput />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("focus-within:border-primary-500")).toBe(true);
    });

    it("다크 모드 스타일이 적용된다", () => {
      const { container } = render(() => <TextInput />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("dark:border-base-700")).toBe(true);
      expect(wrapper.classList.contains("dark:bg-base-900")).toBe(true);
    });
  });
});
