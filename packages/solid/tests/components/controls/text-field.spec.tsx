import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { TextField } from "../../../src/components/controls/text-field";

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

    it("포맷에 맞지 않는 문자는 필터링된다", () => {
      const onChange = vi.fn();
      render(() => <TextField value="" onChange={onChange} format="000-0000" />);

      const input = screen.getByRole("textbox");
      fireEvent.input(input, { target: { value: "abc123def456" } });

      // 숫자만 추출되어 onChange 호출
      expect(onChange).toHaveBeenCalledWith("123456");
    });
  });

  describe("variants", () => {
    it("size prop이 적용된다", () => {
      const onChange = vi.fn();
      const { container } = render(() => <TextField value="" onChange={onChange} size="sm" />);

      const input = container.querySelector("input");
      expect(input?.className).toContain("sm");
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
});
