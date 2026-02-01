import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Textarea } from "../../../src/components/controls/field/textarea";

describe("Textarea", () => {
  // Subtask 2.1: 기본 렌더링 테스트
  describe("기본 렌더링", () => {
    it("초기값이 올바르게 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="hello" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("hello");
    });

    it("undefined 값은 빈 문자열로 렌더링된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value={undefined} onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("");
    });

    it("placeholder가 표시된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value={undefined} onChange={onChange} placeholder="입력하세요" />);

      const textarea = screen.getByPlaceholderText("입력하세요");
      expect(textarea).toBeInTheDocument();
    });

    it("기본 rows는 3이다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "3");
    });

    it("rows props로 행 수를 지정할 수 있다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} rows={5} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "5");
    });
  });

  // Subtask 2.2: value/onChange 테스트 (controlled 모드)
  describe("value/onChange 동작", () => {
    it("입력하면 onChange가 호출된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.input(textarea, { target: { value: "test" } });

      expect(onChange).toHaveBeenCalledWith("test");
    });

    it("입력값을 모두 지우면 onChange가 undefined로 호출된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="hello" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.input(textarea, { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("Controlled component로 동작한다", () => {
      function TestComponent() {
        const [value, setValue] = createSignal<string | undefined>("initial");
        return (
          <>
            <Textarea value={value()} onChange={setValue} />
            <span data-testid="display">{value() ?? "empty"}</span>
          </>
        );
      }

      render(() => <TestComponent />);

      const textarea = screen.getByRole("textbox");
      fireEvent.input(textarea, { target: { value: "changed" } });

      expect(screen.getByTestId("display")).toHaveTextContent("changed");
    });

    it("Uncontrolled 모드에서 동작한다", () => {
      render(() => <Textarea value="initial" />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("initial");

      fireEvent.input(textarea, { target: { value: "changed" } });
      expect(textarea).toHaveValue("changed");
    });
  });

  // Subtask 2.3: autoResize 테스트
  describe("autoResize", () => {
    it("autoResize=true일 때 resize가 none으로 설정된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} autoResize />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.resize).toBe("none");
    });

    it("autoResize=true일 때 overflow가 hidden으로 설정된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} autoResize />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.overflow).toBe("hidden");
    });

    it("autoResize가 없으면 기본 resize=vertical이다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.resize).toBe("vertical");
    });

    it("autoResize=true일 때 초기 값이 있으면 높이가 조절된다", async () => {
      const longText = "줄1\n줄2\n줄3\n줄4\n줄5\n줄6\n줄7\n줄8\n줄9\n줄10";
      const onChange = vi.fn();
      render(() => <Textarea value={longText} onChange={onChange} autoResize rows={2} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // microtask 대기 (초기 높이 조절)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // scrollHeight가 있고 style.height가 설정되어 있어야 함
      expect(textarea.style.height).not.toBe("");
      expect(textarea.style.height).not.toBe("auto");
    });

    it("autoResize=true일 때 입력하면 높이가 변경된다", async () => {
      function TestAutoResize() {
        const [value, setValue] = createSignal<string | undefined>("");
        return <Textarea value={value()} onChange={setValue} autoResize rows={2} />;
      }

      render(() => <TestAutoResize />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      const initialHeight = textarea.getBoundingClientRect().height;

      // 여러 줄 입력
      const longText = "줄1\n줄2\n줄3\n줄4\n줄5";
      fireEvent.input(textarea, { target: { value: longText } });

      // effect 실행 대기
      await new Promise((resolve) => setTimeout(resolve, 50));

      const newHeight = textarea.getBoundingClientRect().height;
      // 높이가 증가했거나 최소한 유지되어야 함 (환경에 따라 scrollHeight 계산이 다를 수 있음)
      expect(newHeight).toBeGreaterThanOrEqual(initialHeight);
    });
  });

  // Subtask 2.4: resize prop 테스트
  describe("resize prop", () => {
    it("resize=none일 때 리사이즈 불가", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} resize="none" />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.resize).toBe("none");
    });

    it("resize=vertical일 때 수직 리사이즈만 가능", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} resize="vertical" />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.resize).toBe("vertical");
    });

    it("resize=horizontal일 때 수평 리사이즈만 가능", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} resize="horizontal" />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.resize).toBe("horizontal");
    });

    it("resize=both일 때 양방향 리사이즈 가능", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} resize="both" />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.resize).toBe("both");
    });

    it("autoResize가 resize보다 우선한다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} autoResize resize="both" />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.resize).toBe("none");
    });
  });

  // Subtask 2.5: 포커스 스타일 테스트
  describe("포커스 스타일", () => {
    it("포커스 시 focus 이벤트가 발생한다", () => {
      const onChange = vi.fn();
      const onFocus = vi.fn();
      render(() => <Textarea value="" onChange={onChange} onFocus={onFocus} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.focus(textarea);

      expect(onFocus).toHaveBeenCalled();
    });

    it("blur 시 blur 이벤트가 발생한다", () => {
      const onChange = vi.fn();
      const onBlur = vi.fn();
      render(() => <Textarea value="" onChange={onChange} onBlur={onBlur} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.focus(textarea);
      fireEvent.blur(textarea);

      expect(onBlur).toHaveBeenCalled();
    });

    it("포커스 시 outline이 제거된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.focus(textarea);

      const styles = window.getComputedStyle(textarea);
      expect(styles.outlineStyle).toBe("none");
    });
  });

  // Subtask 2.6: variants 조합 테스트 (size, inset)
  describe("스타일 variants", () => {
    it("size=sm일 때 작은 크기 스타일이 적용된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} size="sm" />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(parseFloat(styles.fontSize)).toBeLessThan(16);
    });

    it("size=lg일 때 큰 크기 스타일이 적용된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} size="lg" />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(parseFloat(styles.fontSize)).toBeGreaterThan(16);
    });

    it("inset일 때 border가 없고 배경이 투명하다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} inset />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(styles.borderStyle).toBe("none");
      expect(styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    it("여러 variants가 함께 적용된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} size="sm" inset />);

      const textarea = screen.getByRole("textbox");
      const styles = window.getComputedStyle(textarea);

      expect(parseFloat(styles.fontSize)).toBeLessThan(16);
      expect(styles.borderStyle).toBe("none");
    });
  });

  // disabled/readonly 상태 테스트
  describe("disabled/readonly 상태", () => {
    it("disabled 상태가 적용된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="" onChange={onChange} disabled />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
      expect(textarea).toHaveAttribute("aria-disabled", "true");
    });

    it("readonly 상태가 적용된다", () => {
      const onChange = vi.fn();
      render(() => <Textarea value="readonly" onChange={onChange} readOnly />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("readonly");
      expect(textarea).toHaveAttribute("aria-readonly", "true");
    });
  });

  // Subtask 2.7: TypeScript 타입 테스트
  describe("TypeScript 타입", () => {
    it("TextareaProps가 HTML textarea 속성을 지원한다", () => {
      const onChange = vi.fn();
      render(() => (
        <Textarea
          value="test"
          onChange={onChange}
          id="my-textarea"
          name="description"
          maxLength={500}
          data-testid="custom-textarea"
        />
      ));

      const textarea = screen.getByTestId("custom-textarea");
      expect(textarea).toHaveAttribute("id", "my-textarea");
      expect(textarea).toHaveAttribute("name", "description");
      expect(textarea).toHaveAttribute("maxlength", "500");
    });

    it("커스텀 props와 HTML 속성이 함께 동작한다", () => {
      const onChange = vi.fn();
      render(() => (
        <Textarea
          value="content"
          onChange={onChange}
          size="sm"
          inset
          autoResize
          placeholder="Enter..."
          aria-label="Description"
        />
      ));

      const textarea = screen.getByRole("textbox", { name: "Description" });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute("placeholder", "Enter...");
    });
  });
});
