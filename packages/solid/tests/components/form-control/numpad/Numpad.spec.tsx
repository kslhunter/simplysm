import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Numpad } from "../../../../src/components/form-control/numpad/Numpad";

describe("Numpad", () => {
  describe("basic rendering", () => {
    it("data-numpad 속성이 있는 루트 요소를 렌더링한다", () => {
      const { container } = render(() => <Numpad />);
      const root = container.querySelector("[data-numpad]");
      expect(root).toBeTruthy();
    });

    it("숫자 버튼 0-9가 렌더링된다", () => {
      render(() => <Numpad />);

      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
    });

    it("소수점 버튼이 렌더링된다", () => {
      render(() => <Numpad />);
      expect(screen.getByText(".")).toBeInTheDocument();
    });

    it("NumberInput(input)가 렌더링된다", () => {
      render(() => <Numpad />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("C 버튼이 text-danger-500 클래스로 렌더링된다", () => {
      render(() => <Numpad />);
      const cButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-danger-500"));
      expect(cButton).toBeTruthy();
    });

    it("BS 버튼이 text-warning-500 클래스로 렌더링된다", () => {
      render(() => <Numpad />);
      const bsButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-warning-500"));
      expect(bsButton).toBeTruthy();
    });

    it("ENT 버튼은 기본적으로 렌더링되지 않는다", () => {
      render(() => <Numpad />);
      expect(screen.queryByText("ENT")).not.toBeInTheDocument();
    });

    it("- 버튼은 기본적으로 렌더링되지 않는다", () => {
      render(() => <Numpad />);
      // useMinusButton이 없으면 "-" 텍스트를 가진 버튼이 없어야 한다
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-");
      expect(minusButton).toBeFalsy();
    });
  });

  describe("숫자 입력", () => {
    it("숫자 버튼 클릭 시 값이 업데이트된다", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));

      expect(handleChange).toHaveBeenLastCalledWith(123);
    });

    it("소수점 버튼 클릭 시 소수점이 추가된다", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText("5"));

      expect(handleChange).toHaveBeenLastCalledWith(1.5);
    });

    it("소수점 중복 입력은 무시된다", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText(".")); // 중복 소수점
      fireEvent.click(screen.getByText("5"));

      expect(handleChange).toHaveBeenLastCalledWith(1.5);
    });

    it("0 버튼을 여러 번 클릭할 수 있다", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("0"));
      fireEvent.click(screen.getByText("0"));

      expect(handleChange).toHaveBeenLastCalledWith(100);
    });
  });

  describe("기능 버튼", () => {
    it("C 버튼 클릭 시 값이 초기화된다", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      // 값 입력
      fireEvent.click(screen.getByText("5"));
      fireEvent.click(screen.getByText("6"));

      // C 버튼 클릭
      const cButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-danger-500"))!;
      fireEvent.click(cButton);

      expect(handleChange).toHaveBeenLastCalledWith(undefined);
    });

    it("BS 버튼 클릭 시 마지막 문자가 제거된다", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      // 123 입력
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));

      // BS 버튼 클릭
      const bsButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-warning-500"))!;
      fireEvent.click(bsButton);

      expect(handleChange).toHaveBeenLastCalledWith(12);
    });

    it("BS 버튼으로 모든 문자를 제거하면 undefined가 된다", () => {
      const handleChange = vi.fn();
      render(() => <Numpad onValueChange={handleChange} />);

      // 1 입력
      fireEvent.click(screen.getByText("1"));

      // BS 버튼 클릭
      const bsButton = screen
        .getAllByRole("button")
        .find((btn) => btn.className.includes("text-warning-500"))!;
      fireEvent.click(bsButton);

      expect(handleChange).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe("ENT 버튼", () => {
    it("useEnterButton=true일 때 ENT 버튼이 렌더링된다", () => {
      render(() => <Numpad useEnterButton />);
      expect(screen.getByText("ENT")).toBeInTheDocument();
    });

    it("ENT 버튼 클릭 시 onEnterButtonClick이 호출된다", () => {
      const handleEnter = vi.fn();
      render(() => <Numpad useEnterButton onEnterButtonClick={handleEnter} />);

      fireEvent.click(screen.getByText("ENT"));
      expect(handleEnter).toHaveBeenCalledTimes(1);
    });

    it("required이고 값이 없을 때 ENT 버튼이 비활성화된다", () => {
      render(() => <Numpad useEnterButton required />);

      const entButton = screen.getByText("ENT").closest("button")!;
      expect(entButton.disabled).toBe(true);
    });

    it("required이고 값이 있을 때 ENT 버튼이 활성화된다", () => {
      render(() => <Numpad useEnterButton required value={123} />);

      const entButton = screen.getByText("ENT").closest("button")!;
      expect(entButton.disabled).toBe(false);
    });
  });

  describe("Minus 버튼", () => {
    it("useMinusButton=true일 때 - 버튼이 렌더링된다", () => {
      render(() => <Numpad useMinusButton />);

      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-");
      expect(minusButton).toBeTruthy();
    });

    it("- 버튼 클릭 시 부호가 토글된다 (양수 -> 음수)", () => {
      const handleChange = vi.fn();
      render(() => <Numpad useMinusButton onValueChange={handleChange} />);

      // 5 입력
      fireEvent.click(screen.getByText("5"));

      // - 버튼 클릭
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-")!;
      fireEvent.click(minusButton);

      expect(handleChange).toHaveBeenLastCalledWith(-5);
    });

    it("- 버튼 클릭 시 부호가 토글된다 (음수 -> 양수)", () => {
      const handleChange = vi.fn();
      render(() => <Numpad useMinusButton value={-5} onValueChange={handleChange} />);

      // - 버튼 클릭
      const minusButton = screen.getAllByRole("button").find((btn) => btn.textContent === "-")!;
      fireEvent.click(minusButton);

      expect(handleChange).toHaveBeenLastCalledWith(5);
    });
  });

  describe("controlled 모드", () => {
    it("외부 값 변경이 반영된다", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <Numpad value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(200);
      expect(input).toHaveValue("200");
    });

    it("외부에서 undefined로 설정하면 입력이 비워진다", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <Numpad value={value()} onValueChange={setValue} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("100");

      setValue(undefined);
      expect(input).toHaveValue("");
    });
  });
});
