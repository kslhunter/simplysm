import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { invalid } from "../../src/directives/invalid";
import { invalidContainer, invalidDot } from "../../src/directives/invalid.css";
import { TextField } from "../../src/components/controls/field/text-field";
import { Textarea } from "../../src/components/controls/field/textarea";
import { Checkbox } from "../../src/components/controls/choice/checkbox";
import { Switch } from "../../src/components/controls/choice/switch";

// directive 등록
void invalid;

describe("use:invalid directive", () => {
  describe("유효성 표시", () => {
    it("에러 메시지가 있으면 aria-invalid=true가 설정된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid="에러 발생">
            content
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "true");
    });

    it("에러 메시지가 없으면 aria-invalid=false가 설정된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid="">
            content
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "false");
    });

    it("에러 상태가 변경되면 aria-invalid도 업데이트된다", () => {
      function TestComponent() {
        const [hasError, setHasError] = createSignal(false);
        const errorMessage = () => (hasError() ? "에러!" : "");
        return (
          <div>
            <div data-testid="container" use:invalid={errorMessage()}>
              content
            </div>
            <button data-testid="toggle" onClick={() => setHasError(!hasError())}>
              Toggle
            </button>
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "false");

      // 에러 상태로 변경
      screen.getByTestId("toggle").click();

      // 상태 변경 후 aria-invalid 업데이트 확인
      expect(container).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("hidden input", () => {
    it("hidden input이 생성되고 setCustomValidity가 호출된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid="필수 입력입니다">
            content
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      const hiddenInput = container.querySelector("input") as HTMLInputElement;

      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput.validationMessage).toBe("필수 입력입니다");
    });
  });

  describe("CSS 클래스", () => {
    it("에러 상태에서 invalidContainer와 invalidDot 클래스가 추가된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid="에러!">
            content
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      // invalid directive가 추가하는 클래스 확인
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(true);
    });

    it("valid 상태에서는 invalidDot 클래스가 없다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid="">
            content
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      // container에는 invalidContainer 클래스만 있어야 함 (invalidDot 없음)
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(false);
    });

    it("에러 상태 변경 시 invalidDot 클래스가 토글된다", () => {
      function TestComponent() {
        const [hasError, setHasError] = createSignal(false);
        const errorMessage = () => (hasError() ? "에러!" : "");
        return (
          <div>
            <div data-testid="container" use:invalid={errorMessage()}>
              content
            </div>
            <button data-testid="toggle" onClick={() => setHasError(!hasError())}>
              Toggle
            </button>
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");

      // 초기: valid 상태 (invalidContainer만, invalidDot 없음)
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(false);

      // 에러 상태로 변경
      screen.getByTestId("toggle").click();

      // 에러 상태: invalidContainer + invalidDot
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(true);

      // 다시 valid 상태로
      screen.getByTestId("toggle").click();

      // 다시 invalidContainer만
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(false);
    });
  });

  describe("TextField + use:invalid 조합", () => {
    it("TextField을 감싼 컨테이너에 에러 상태가 표시된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid="이름을 입력하세요">
            <TextField value="" placeholder="이름" />
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "true");
      // 컨테이너에 invalidContainer + invalidDot 클래스
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(true);
    });

    it("TextField 값 입력 후 에러 상태가 해제된다", () => {
      function TestComponent() {
        const [name, setName] = createSignal("");
        const errorMessage = () => (name().length === 0 ? "이름을 입력하세요" : "");
        return (
          <div data-testid="container" use:invalid={errorMessage()}>
            <TextField value={name()} onChange={setName} placeholder="이름" />
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      const input = screen.getByRole("textbox");

      // 초기 에러 상태
      expect(container).toHaveAttribute("aria-invalid", "true");

      // 값 입력
      fireEvent.input(input, { target: { value: "홍길동" } });

      // 에러 해제
      expect(container).toHaveAttribute("aria-invalid", "false");
    });

    it("이메일 형식 검증이 동작한다", () => {
      function TestComponent() {
        const [email, setEmail] = createSignal("");
        const errorMessage = () => {
          if (email().length === 0) return "이메일을 입력하세요";
          if (!email().includes("@")) return "올바른 이메일 형식이 아닙니다";
          return "";
        };
        return (
          <div data-testid="container" use:invalid={errorMessage()}>
            <TextField value={email()} onChange={setEmail} type="email" placeholder="이메일" />
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      const input = screen.getByRole("textbox");

      // 초기 에러 (빈 값)
      expect(container).toHaveAttribute("aria-invalid", "true");

      // @ 없는 값 입력
      fireEvent.input(input, { target: { value: "test" } });
      expect(container).toHaveAttribute("aria-invalid", "true");

      // 올바른 형식 입력
      fireEvent.input(input, { target: { value: "test@example.com" } });
      expect(container).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("Textarea + use:invalid 조합", () => {
    it("Textarea를 감싼 컨테이너에 에러 상태가 표시된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid={"내용을 입력하세요"}>
            <Textarea value="" placeholder="내용" />
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "true");
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(true);
    });

    it("Textarea 값 입력 후 에러 상태가 해제된다", () => {
      function TestComponent() {
        const [content, setContent] = createSignal<string | undefined>(undefined);
        const errorMessage = () =>
          content() == null || content() === "" ? "내용을 입력하세요" : "";
        return (
          <div data-testid="container" use:invalid={errorMessage()}>
            <Textarea value={content()} onChange={setContent} placeholder="내용" />
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      const textarea = screen.getByRole("textbox");

      // 초기 에러 상태
      expect(container).toHaveAttribute("aria-invalid", "true");

      // 값 입력
      fireEvent.input(textarea, { target: { value: "테스트 내용입니다." } });

      // 에러 해제
      expect(container).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("Checkbox + use:invalid 조합", () => {
    it("Checkbox를 감싼 컨테이너에 에러 상태가 표시된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid="약관에 동의해주세요">
            <Checkbox value={false}>약관 동의</Checkbox>
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "true");
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(true);
    });

    it("Checkbox 체크 후 에러 상태가 해제된다", () => {
      function TestComponent() {
        const [agreed, setAgreed] = createSignal(false);
        const errorMessage = () => (!agreed() ? "약관에 동의해주세요" : "");
        return (
          <div data-testid="container" use:invalid={errorMessage()}>
            <Checkbox value={agreed()} onChange={setAgreed}>
              약관 동의
            </Checkbox>
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      const checkbox = screen.getByRole("checkbox");

      // 초기 에러 상태
      expect(container).toHaveAttribute("aria-invalid", "true");

      // 체크
      fireEvent.click(checkbox);

      // 에러 해제
      expect(container).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("Switch + use:invalid 조합", () => {
    it("Switch를 감싼 컨테이너에 에러 상태가 표시된다", () => {
      function TestComponent() {
        return (
          <div data-testid="container" use:invalid={"알림을 활성화해주세요"}>
            <Switch checked={false}>알림 수신</Switch>
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      expect(container).toHaveAttribute("aria-invalid", "true");
      expect(container.classList.contains(invalidContainer)).toBe(true);
      expect(container.classList.contains(invalidDot)).toBe(true);
    });

    it("Switch 켜기 후 에러 상태가 해제된다", () => {
      function TestComponent() {
        const [enabled, setEnabled] = createSignal(false);
        const errorMessage = () => (!enabled() ? "알림을 활성화해주세요" : "");
        return (
          <div data-testid="container" use:invalid={errorMessage()}>
            <Switch checked={enabled()} onChange={setEnabled}>
              알림 수신
            </Switch>
          </div>
        );
      }

      render(() => <TestComponent />);

      const container = screen.getByTestId("container");
      const switchEl = screen.getByRole("switch");

      // 초기 에러 상태
      expect(container).toHaveAttribute("aria-invalid", "true");

      // 스위치 켜기
      fireEvent.click(switchEl);

      // 에러 해제
      expect(container).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("폼 제출 시 자동 포커스 이동", () => {
    it("invalid 필드가 있으면 폼이 유효하지 않다", () => {
      function TestComponent() {
        return (
          <form data-testid="form">
            <div use:invalid="필수 입력">
              <TextField value="" />
            </div>
            <button type="submit">제출</button>
          </form>
        );
      }

      render(() => <TestComponent />);

      const form = screen.getByTestId("form") as HTMLFormElement;
      expect(form.checkValidity()).toBe(false);
    });

    it("모든 필드가 valid하면 폼이 유효하다", () => {
      function TestComponent() {
        return (
          <form data-testid="form">
            <div use:invalid="">
              <TextField value="값" />
            </div>
            <button type="submit">제출</button>
          </form>
        );
      }

      render(() => <TestComponent />);

      const form = screen.getByTestId("form") as HTMLFormElement;
      expect(form.checkValidity()).toBe(true);
    });

    it("reportValidity 호출 시 에러 메시지가 표시되고 false를 반환한다", () => {
      function TestComponent() {
        const onSubmit = (e: Event) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          form.reportValidity();
        };

        return (
          <form data-testid="form" onSubmit={onSubmit}>
            <div use:invalid="이름을 입력하세요">
              <TextField value="" />
            </div>
            <button type="submit">제출</button>
          </form>
        );
      }

      render(() => <TestComponent />);

      const form = screen.getByTestId("form") as HTMLFormElement;
      // reportValidity는 에러 메시지를 표시하고 false를 반환
      expect(form.reportValidity()).toBe(false);
    });

    it("여러 invalid 필드 중 첫 번째 필드의 hidden input에 에러 메시지가 설정된다", () => {
      function TestComponent() {
        return (
          <form data-testid="form">
            <div data-testid="field1" use:invalid="첫 번째 에러">
              <TextField value="" />
            </div>
            <div data-testid="field2" use:invalid="두 번째 에러">
              <TextField value="" />
            </div>
            <button type="submit">제출</button>
          </form>
        );
      }

      render(() => <TestComponent />);

      const form = screen.getByTestId("form") as HTMLFormElement;
      const field1 = screen.getByTestId("field1");
      const field2 = screen.getByTestId("field2");

      // reportValidity 호출 - 첫 번째 invalid 필드로 포커스 이동 시도
      form.reportValidity();

      // 첫 번째 필드의 hidden input에 에러 메시지 설정 확인
      // invalid directive가 생성한 hidden input (type="text", 시각적으로 숨김)
      const hiddenInputs1 = field1.querySelectorAll("input");
      const validationInput1 = Array.from(hiddenInputs1).find(
        (input) => input.validationMessage !== "",
      );
      expect(validationInput1?.validationMessage).toBe("첫 번째 에러");

      // 두 번째 필드도 에러 메시지 설정 확인
      const hiddenInputs2 = field2.querySelectorAll("input");
      const validationInput2 = Array.from(hiddenInputs2).find(
        (input) => input.validationMessage !== "",
      );
      expect(validationInput2?.validationMessage).toBe("두 번째 에러");
    });
  });
});
