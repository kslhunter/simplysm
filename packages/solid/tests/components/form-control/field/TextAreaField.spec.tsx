import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { TextAreaField } from "../../../../src/components/form-control/field/TextAreaField";

describe("TextAreaField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("textarea 요소가 렌더링된다", () => {
      const { container } = render(() => <TextAreaField />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeTruthy();
    });

    it("placeholder가 textarea에 적용된다", () => {
      const { container } = render(() => <TextAreaField placeholder="내용을 입력하세요" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe("내용을 입력하세요");
    });

    it("title이 textarea에 적용된다", () => {
      const { container } = render(() => <TextAreaField title="Textarea title" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.title).toBe("Textarea title");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 textarea의 값으로 표시된다", () => {
      const { container } = render(() => <TextAreaField value="Hello" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Hello");
    });

    it("onValueChange가 입력 시 호출된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <TextAreaField value="" onValueChange={handleChange} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      fireEvent.input(textarea, { target: { value: "Test" } });

      expect(handleChange).toHaveBeenCalledWith("Test");
    });

    it("외부 상태 변경 시 textarea 값이 업데이트된다", () => {
      const [value, setValue] = createSignal("Initial");
      const { container } = render(() => <TextAreaField value={value()} onValueChange={setValue} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      setValue("Updated");
      expect(textarea.value).toBe("Updated");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => <TextAreaField value="Initial" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      fireEvent.input(textarea, { target: { value: "Changed" } });
      expect(textarea.value).toBe("Changed");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 textarea가 렌더링되지 않는다", () => {
      const { container } = render(() => <TextAreaField disabled value="Disabled text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <TextAreaField disabled value="Disabled text" />);
      expect(getByText("Disabled text")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <TextAreaField disabled value="Text" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 textarea가 렌더링되지 않는다", () => {
      const { container } = render(() => <TextAreaField readonly value="Readonly text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <TextAreaField readonly value="Readonly text" />);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("error 스타일", () => {
    it("error=true일 때 에러 스타일이 적용된다", () => {
      const { container } = render(() => <TextAreaField error />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-danger-500")).toBe(true);
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <TextAreaField size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <TextAreaField size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 배경이 투명하다", () => {
      const { container } = render(() => <TextAreaField inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-none")).toBe(true);
      expect(wrapper.classList.contains("bg-transparent")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <TextAreaField class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("자동 높이 조절", () => {
    it("hidden div가 존재한다 (높이 측정용)", () => {
      const { container } = render(() => <TextAreaField value="Test" />);
      const wrapper = container.firstChild as HTMLElement;
      const hiddenDiv = wrapper.querySelector("[data-hidden-content]") as HTMLElement;
      expect(hiddenDiv).toBeTruthy();
      expect(hiddenDiv.style.visibility).toBe("hidden");
    });
  });
});
