import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import { SdDateField } from "../../src/components/SdDateField";

describe("SdDateField", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("type=date 렌더링", () => {
      const { container } = render(() => <SdDateField type="date" />);
      const input = container.querySelector("input");

      expect(input).toBeDefined();
      expect(input?.getAttribute("type")).toBe("date");
    });

    it("type=month 렌더링", () => {
      const { container } = render(() => <SdDateField type="month" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("type")).toBe("month");
    });

    it("type=year 렌더링", () => {
      const { container } = render(() => <SdDateField type="year" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("type")).toBe("number");
    });

    it("날짜 입력 시 값 변경", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdDateField type="date" onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "2025-01-15" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
        const result = handleChange.mock.calls[0][0] as DateOnly;
        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(15);
      });
    });

    it("빈 값 입력 시 undefined 반환", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdDateField type="date" defaultValue={new DateOnly(2025, 1, 15)} onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("type별 포맷", () => {
    it("type=date: yyyy-MM-dd 포맷", () => {
      const { container } = render(() => <SdDateField type="date" defaultValue={new DateOnly(2025, 1, 15)} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("2025-01-15");
    });

    it("type=month: yyyy-MM 포맷", () => {
      const { container } = render(() => <SdDateField type="month" defaultValue={new DateOnly(2025, 1, 1)} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("2025-01");
    });

    it("type=year: yyyy 포맷", () => {
      const { container } = render(() => <SdDateField type="year" defaultValue={new DateOnly(2025, 1, 1)} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("2025");
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드", async () => {
      const [date, setDate] = createSignal<DateOnly | undefined>(new DateOnly(2025, 1, 1));
      const { container } = render(() => <SdDateField type="date" value={date()} onChange={setDate} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("2025-01-01");

      fireEvent.input(input, { target: { value: "2025-12-31" } });

      await waitFor(() => {
        expect(input.value).toBe("2025-12-31");
      });
    });

    it("uncontrolled 모드", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdDateField type="date" defaultValue={new DateOnly(2025, 1, 1)} onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "2025-06-15" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
        const result = handleChange.mock.calls[0][0] as DateOnly;
        expect(result.month).toBe(6);
        expect(result.day).toBe(15);
      });
    });
  });

  describe("min/max", () => {
    it("min 속성 적용", () => {
      const { container } = render(() => <SdDateField type="date" min={new DateOnly(2025, 1, 1)} />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("min")).toBe("2025-01-01");
    });

    it("max 속성 적용", () => {
      const { container } = render(() => <SdDateField type="date" max={new DateOnly(2025, 12, 31)} />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("max")).toBe("2025-12-31");
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태", () => {
      const { container } = render(() => <SdDateField type="date" disabled defaultValue={new DateOnly(2025, 1, 15)} />);
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("2025-01-15");
    });

    it("readonly 상태", () => {
      const { container } = render(() => <SdDateField type="date" readonly defaultValue={new DateOnly(2025, 1, 15)} />);
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("2025-01-15");
    });
  });

  describe("inset 고정 너비", () => {
    it("type=date inset 시 고정 너비", () => {
      const { container } = render(() => <SdDateField type="date" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("w-[8.25em]");
    });

    it("type=month inset 시 고정 너비", () => {
      const { container } = render(() => <SdDateField type="month" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("w-[8.25em]");
    });

    it("type=year inset 시 고정 너비", () => {
      const { container } = render(() => <SdDateField type="year" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("w-[4em]");
    });
  });

  describe("Variants", () => {
    it("size=sm 적용", () => {
      const { container } = render(() => <SdDateField type="date" size="sm" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-sm");
      expect(input?.className).toContain("py-ctrl-xs");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdDateField type="date" theme="primary" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("bg-primary/15");
    });
  });
});
