import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { TextField } from "../../../src/components/controls/field/text-field";

describe("TextField", () => {
  describe("기본 렌더링", () => {
    it("초기값이 올바르게 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="hello" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("hello");
    });

    it("undefined 값은 빈 문자열로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value={undefined} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });

    it("placeholder가 표시된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value={undefined} onChange={onChange} placeholder="입력하세요" />);

      const input = screen.getByPlaceholderText("입력하세요");
      expect(input).toBeInTheDocument();
    });
  });

  describe("value/onChange 동작", () => {
    it("입력하면 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "test" } });

      expect(onChange).toHaveBeenCalledWith("test");
    });

    it("입력값을 모두 지우면 onChange가 undefined로 호출된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="hello" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("Controlled component로 동작한다", () => {
      function TestComponent() {
        const [value, setValue] = createSignal<string | undefined>("initial");
        return (
          <>
            <TextField value={value()} onChange={setValue} />
            <span data-testid="display">{value() ?? "empty"}</span>
          </>
        );
      }

      render(() => <TestComponent />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "changed" } });

      expect(screen.getByTestId("display")).toHaveTextContent("changed");
    });
  });

  describe("type prop", () => {
    it("type=password일 때 입력이 마스킹된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="secret" onChange={onChange} type="password" />);

      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it("type=email일 때 email input으로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} type="email" />);

      const input = document.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe("format prop", () => {
    it("blur 시 포맷이 적용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="01012345678" onChange={onChange} format="000-0000-0000" />);

      const input = screen.getByRole("textbox");

      // blur 상태에서는 포맷 적용
      expect(input).toHaveValue("010-1234-5678");
    });

    it("포커스 시 raw 값이 표시된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="01012345678" onChange={onChange} format="000-0000-0000" />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      expect(input).toHaveValue("01012345678");
    });

    it("포맷에 맞지 않는 문자는 필터링된다 (0 패턴 - 숫자만)", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} format="000-0000" />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "abc123def456" } });

      // 숫자만 추출되어 onChange 호출
      expect(onChange).toHaveBeenCalledWith("123456");
    });

    it("X 패턴으로 대문자와 숫자만 허용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} format="XXX-XXX" />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "ABc123def" } });

      // 대문자와 숫자만 추출
      expect(onChange).toHaveBeenCalledWith("AB123");
    });

    it("x 패턴으로 소문자와 숫자만 허용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} format="xxx-xxx" />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "ABc123DEF" } });

      // 소문자와 숫자만 추출
      expect(onChange).toHaveBeenCalledWith("c123");
    });

    it("* 패턴으로 모든 문자가 허용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} format="***-***" />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "Ab1가나다" } });

      // 모든 문자 허용
      expect(onChange).toHaveBeenCalledWith("Ab1가나다");
    });

    it("값이 format보다 길면 잘린다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="123456789" onChange={onChange} format="000-000" />);

      const input = screen.getByRole("textbox");
      // blur 상태에서 포맷 적용 - 6자리까지만 표시
      expect(input).toHaveValue("123-456");
    });

    it("format이 없으면 원본 값이 그대로 표시된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="hello world" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("hello world");
    });
  });

  describe("스타일 variants", () => {
    it("size=sm일 때 작은 크기 스타일이 적용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} size="sm" />);

      const input = screen.getByRole("textbox");
      const styles = window.getComputedStyle(input);

      // sm 사이즈는 base보다 작은 font-size 사용
      expect(parseFloat(styles.fontSize)).toBeLessThan(16);
    });

    it("size=lg일 때 큰 크기 스타일이 적용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} size="lg" />);

      const input = screen.getByRole("textbox");
      const styles = window.getComputedStyle(input);

      // lg 사이즈는 base보다 큰 font-size 사용
      expect(parseFloat(styles.fontSize)).toBeGreaterThan(16);
    });

    it("inset일 때 border가 없고 배경이 투명하다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} inset />);

      const input = screen.getByRole("textbox");
      const styles = window.getComputedStyle(input);

      // inset 모드는 border 없음
      expect(styles.borderStyle).toBe("none");
      // inset 모드는 투명 배경
      expect(styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    it("inline일 때 컨테이너 구조로 렌더링된다", () => {
      const onChange = vi.fn();
      const { container } = render(() => <TextField value="test" onChange={onChange} inline />);

      // inline 모드에서는 div 컨테이너가 렌더링됨
      const containerDiv = container.querySelector("div");
      expect(containerDiv).toBeInTheDocument();

      // 컨테이너 스타일 확인
      const containerStyles = window.getComputedStyle(containerDiv!);
      expect(containerStyles.position).toBe("relative");
      expect(containerStyles.display).toBe("inline-block");

      // content 영역 확인 (visibility: hidden)
      const contentDiv = containerDiv?.querySelector("div");
      expect(contentDiv).toBeInTheDocument();
      const contentStyles = window.getComputedStyle(contentDiv!);
      expect(contentStyles.visibility).toBe("hidden");

      // input은 absolute 위치
      const input = container.querySelector("input");
      const inputStyles = window.getComputedStyle(input!);
      expect(inputStyles.position).toBe("absolute");
    });

    it("여러 variants가 함께 적용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} size="sm" inset />);

      const input = screen.getByRole("textbox");
      const styles = window.getComputedStyle(input);

      // sm + inset 조합
      expect(parseFloat(styles.fontSize)).toBeLessThan(16);
      expect(styles.borderStyle).toBe("none");
    });
  });

  describe("포커스 스타일", () => {
    it("포커스 시 focus 이벤트가 발생한다", () => {
      const onChange = vi.fn();
      const onFocus = vi.fn();
      render(() => <TextField value="" onChange={onChange} onFocus={onFocus} />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      expect(onFocus).toHaveBeenCalled();
    });

    it("blur 시 blur 이벤트가 발생한다", () => {
      const onChange = vi.fn();
      const onBlur = vi.fn();
      render(() => <TextField value="" onChange={onChange} onBlur={onBlur} />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalled();
    });

    it("포커스 시 outline이 제거된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      const styles = window.getComputedStyle(input);
      // outline이 "none" 또는 "rgb(...) none 0px" 형태로 반환됨
      expect(styles.outlineStyle).toBe("none");
    });
  });

  describe("disabled/readonly 상태", () => {
    it("disabled 상태가 적용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} disabled />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute("aria-disabled", "true");
    });

    it("readonly 상태가 적용된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="readonly" onChange={onChange} readOnly />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readonly");
      expect(input).toHaveAttribute("aria-readonly", "true");
    });
  });

  describe("TypeScript 타입 (AC10)", () => {
    it("TextFieldProps가 HTML input 속성을 지원한다", () => {
      const onChange = vi.fn();
      render(() => (
        <TextField
          value="test"
          onChange={onChange}
          id="my-field"
          name="username"
          maxLength={50}
          autocomplete="off"
          data-testid="custom-field"
        />
      ));

      const input = screen.getByTestId("custom-field");
      expect(input).toHaveAttribute("id", "my-field");
      expect(input).toHaveAttribute("name", "username");
      expect(input).toHaveAttribute("maxlength", "50");
      expect(input).toHaveAttribute("autocomplete", "off");
    });

    it("커스텀 props와 HTML 속성이 함께 동작한다", () => {
      const onChange = vi.fn();
      render(() => (
        <TextField
          value="formatted"
          onChange={onChange}
          format="000-0000"
          size="sm"
          inset
          placeholder="Enter..."
          aria-label="Phone number"
        />
      ));

      const input = screen.getByRole("textbox", { name: "Phone number" });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Enter...");
    });
  });
});
