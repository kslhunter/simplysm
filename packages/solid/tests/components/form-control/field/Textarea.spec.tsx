import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Textarea } from "../../../../src/components/form-control/field/Textarea";

describe("Textarea 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("textarea 요소가 렌더링된다", () => {
      const { container } = render(() => <Textarea />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeTruthy();
    });

    it("placeholder가 textarea에 적용된다", () => {
      const { container } = render(() => <Textarea placeholder="내용을 입력하세요" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe("내용을 입력하세요");
    });

    it("title이 textarea에 적용된다", () => {
      const { container } = render(() => <Textarea title="Textarea title" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.title).toBe("Textarea title");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 textarea의 값으로 표시된다", () => {
      const { container } = render(() => <Textarea value="Hello" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Hello");
    });

    it("onValueChange가 입력 시 호출된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <Textarea value="" onValueChange={handleChange} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      fireEvent.input(textarea, { target: { value: "Test" } });

      expect(handleChange).toHaveBeenCalledWith("Test");
    });

    it("외부 상태 변경 시 textarea 값이 업데이트된다", () => {
      const [value, setValue] = createSignal("Initial");
      const { container } = render(() => <Textarea value={value()} onValueChange={setValue} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      setValue("Updated");
      expect(textarea.value).toBe("Updated");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onValueChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => <Textarea value="Initial" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      fireEvent.input(textarea, { target: { value: "Changed" } });
      expect(textarea.value).toBe("Changed");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 textarea가 렌더링되지 않는다", () => {
      const { container } = render(() => <Textarea disabled value="Disabled text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <Textarea disabled value="Disabled text" />);
      expect(getByText("Disabled text")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <Textarea disabled value="Text" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 textarea가 렌더링되지 않는다", () => {
      const { container } = render(() => <Textarea readonly value="Readonly text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <Textarea readonly value="Readonly text" />);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <Textarea size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <Textarea size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 inset 배경색이 적용된다", () => {
      const { container } = render(() => <Textarea inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("relative")).toBe(true);
      const content = wrapper.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(content.classList.contains("border-none")).toBe(true);
      expect(content.classList.contains("bg-primary-50")).toBe(true);
    });

    it("inset + readonly일 때 content div가 보이고 textarea가 없다", () => {
      const { container } = render(() => <Textarea inset readonly value="Hello" />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.classList.contains("relative")).toBe(true);

      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.textContent).toContain("Hello");

      expect(outer.querySelector("textarea")).toBeFalsy();
    });

    it("inset + editable일 때 content div(hidden)와 textarea가 모두 존재한다", () => {
      const { container } = render(() => <Textarea inset value="Hello" />);
      const outer = container.firstChild as HTMLElement;

      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv).toBeTruthy();
      expect(contentDiv.style.visibility).toBe("hidden");

      const textarea = outer.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe("Hello");
    });

    it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
      const { container } = render(() => <Textarea inset readonly />);
      const outer = container.firstChild as HTMLElement;
      const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
      expect(contentDiv.textContent).toContain("\u00A0");
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Textarea class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("자동 높이 조절", () => {
    it("hidden div가 존재한다 (높이 측정용)", () => {
      const { container } = render(() => <Textarea value="Test" />);
      const wrapper = container.firstChild as HTMLElement;
      const hiddenDiv = wrapper.querySelector("[data-hidden-content]") as HTMLElement;
      expect(hiddenDiv).toBeTruthy();
      expect(hiddenDiv.style.visibility).toBe("hidden");
    });
  });

  describe("validation", () => {
    it("required일 때 빈 값이면 hidden input에 에러 메시지가 설정된다", () => {
      const { container } = render(() => <Textarea required value="" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
    });

    it("required일 때 값이 있으면 유효하다", () => {
      const { container } = render(() => <Textarea required value="hello" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("minLength 위반 시 에러 메시지가 설정된다", () => {
      const { container } = render(() => <Textarea minLength={3} value="ab" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("최소 3자 이상 입력하세요");
    });

    it("maxLength 위반 시 에러 메시지가 설정된다", () => {
      const { container } = render(() => <Textarea maxLength={5} value="abcdef" />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("최대 5자까지 입력 가능합니다");
    });

    it("validate 함수가 에러를 반환하면 해당 메시지가 설정된다", () => {
      const { container } = render(() => (
        <Textarea
          validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
          value="hello"
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("이메일 형식이 아닙니다");
    });

    it("기본 validator 통과 후 validate 함수가 실행된다", () => {
      const { container } = render(() => (
        <Textarea
          required
          validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
          value=""
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
    });
  });
});
