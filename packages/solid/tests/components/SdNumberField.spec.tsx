import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdNumberField } from "../../src/components/SdNumberField";

describe("SdNumberField", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("기본 렌더링", () => {
      const { container } = render(() => <SdNumberField placeholder="숫자 입력" />);
      const input = container.querySelector("input");

      expect(input).toBeDefined();
      expect(input?.getAttribute("type")).toBe("text");
      expect(input?.getAttribute("inputmode")).toBe("numeric");
      expect(input?.getAttribute("placeholder")).toBe("숫자 입력");
    });

    it("숫자 입력 시 값 변경", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdNumberField onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "1234" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(1234);
      });
    });

    it("소수점 입력", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdNumberField onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "123.45" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(123.45);
      });
    });

    it("음수 입력", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdNumberField onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "-100" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(-100);
      });
    });

    it("빈 값 입력 시 undefined 반환", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdNumberField defaultValue={100} onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(undefined);
      });
    });

    it("숫자가 아닌 문자 제거", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdNumberField onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "abc123def" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(123);
      });
    });
  });

  describe("콤마 포맷팅", () => {
    it("useComma=true (기본값): 천단위 콤마 표시", () => {
      const { container } = render(() => <SdNumberField defaultValue={1234567} />);
      const input = container.querySelector("input")!;

      // 포커스가 없을 때 콤마 표시
      expect(input.value).toBe("1,234,567");
    });

    it("useComma=false: 콤마 없이 표시", () => {
      const { container } = render(() => <SdNumberField defaultValue={1234567} useComma={false} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("1234567");
    });

    it("포커스 시 콤마 제거", async () => {
      const { container } = render(() => <SdNumberField defaultValue={1234567} />);
      const input = container.querySelector("input")!;

      fireEvent.focus(input);

      await waitFor(() => {
        expect(input.value).toBe("1234567");
      });
    });

    it("블러 시 콤마 복원", async () => {
      const { container } = render(() => <SdNumberField defaultValue={1234567} />);
      const input = container.querySelector("input")!;

      fireEvent.focus(input);
      fireEvent.blur(input);

      await waitFor(() => {
        expect(input.value).toBe("1,234,567");
      });
    });
  });

  describe("minDigits", () => {
    it("minDigits로 최소 소수점 자릿수 지정", () => {
      const { container } = render(() => <SdNumberField defaultValue={100} minDigits={2} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("100.00");
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드", async () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      const { container } = render(() => <SdNumberField value={value()} onChange={setValue} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("100");

      fireEvent.focus(input);
      fireEvent.input(input, { target: { value: "200" } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(input.value).toBe("200");
      });
    });

    it("uncontrolled 모드", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdNumberField defaultValue={100} onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.focus(input);
      fireEvent.input(input, { target: { value: "200" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(200);
      });
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태", () => {
      const { container } = render(() => <SdNumberField disabled defaultValue={1000} />);
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("1,000");
    });

    it("readonly 상태", () => {
      const { container } = render(() => <SdNumberField readonly defaultValue={1000} />);
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("1,000");
    });
  });

  describe("Variants", () => {
    it("오른쪽 정렬 기본 적용", () => {
      const { container } = render(() => <SdNumberField />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("text-right");
    });

    it("size=sm 적용", () => {
      const { container } = render(() => <SdNumberField size="sm" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-sm");
      expect(input?.className).toContain("py-ctrl-xs");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdNumberField theme="primary" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("bg-primary/15");
    });
  });
});
