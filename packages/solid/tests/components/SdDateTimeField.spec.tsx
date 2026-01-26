import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DateTime } from "@simplysm/core-common";
import { SdDateTimeField } from "../../src/components/SdDateTimeField";

describe("SdDateTimeField", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("type=datetime 렌더링", () => {
      const { container } = render(() => <SdDateTimeField type="datetime" />);
      const input = container.querySelector("input");

      expect(input).toBeDefined();
      expect(input?.getAttribute("type")).toBe("datetime-local");
      expect(input?.getAttribute("step")).toBe("any");
    });

    it("type=datetime-sec 렌더링 (step=1)", () => {
      const { container } = render(() => <SdDateTimeField type="datetime-sec" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("step")).toBe("1");
    });

    it("날짜시간 입력 시 값 변경", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdDateTimeField type="datetime" onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "2025-01-15T10:30" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
        const result = handleChange.mock.calls[0][0] as DateTime;
        expect(result.year).toBe(2025);
        expect(result.month).toBe(1);
        expect(result.day).toBe(15);
        expect(result.hour).toBe(10);
        expect(result.minute).toBe(30);
      });
    });

    it("빈 값 입력 시 undefined 반환", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdDateTimeField type="datetime" defaultValue={new DateTime(2025, 1, 15, 10, 30)} onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("type별 포맷", () => {
    it("type=datetime: yyyy-MM-ddTHH:mm 포맷", () => {
      const { container } = render(() => (
        <SdDateTimeField type="datetime" defaultValue={new DateTime(2025, 1, 15, 10, 30)} />
      ));
      const input = container.querySelector("input")!;

      expect(input.value).toBe("2025-01-15T10:30");
    });

    it("type=datetime-sec: yyyy-MM-ddTHH:mm:ss 포맷", () => {
      const { container } = render(() => (
        <SdDateTimeField type="datetime-sec" defaultValue={new DateTime(2025, 1, 15, 10, 30, 45)} />
      ));
      const input = container.querySelector("input")!;

      expect(input.value).toBe("2025-01-15T10:30:45");
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드", async () => {
      const [dateTime, setDateTime] = createSignal<DateTime | undefined>(new DateTime(2025, 1, 1, 9, 0));
      const { container } = render(() => (
        <SdDateTimeField type="datetime" value={dateTime()} onChange={setDateTime} />
      ));
      const input = container.querySelector("input")!;

      expect(input.value).toBe("2025-01-01T09:00");

      fireEvent.input(input, { target: { value: "2025-12-31T18:30" } });

      await waitFor(() => {
        expect(input.value).toBe("2025-12-31T18:30");
      });
    });

    it("uncontrolled 모드", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdDateTimeField type="datetime" defaultValue={new DateTime(2025, 1, 1, 9, 0)} onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "2025-06-15T14:15" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
        const result = handleChange.mock.calls[0][0] as DateTime;
        expect(result.month).toBe(6);
        expect(result.day).toBe(15);
        expect(result.hour).toBe(14);
        expect(result.minute).toBe(15);
      });
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태 - 오전/오후 포맷 표시", () => {
      const { container } = render(() => (
        <SdDateTimeField type="datetime" disabled defaultValue={new DateTime(2025, 1, 15, 10, 30)} />
      ));
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("2025-01-15 오전 10:30");
    });

    it("readonly 상태 - 오후 시간", () => {
      const { container } = render(() => (
        <SdDateTimeField type="datetime" readonly defaultValue={new DateTime(2025, 1, 15, 14, 30)} />
      ));
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("2025-01-15 오후 02:30");
    });

    it("readonly 상태 - datetime-sec 포맷", () => {
      const { container } = render(() => (
        <SdDateTimeField type="datetime-sec" readonly defaultValue={new DateTime(2025, 1, 15, 14, 30, 45)} />
      ));
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("2025-01-15 오후 02:30:45");
    });
  });

  describe("inset 고정 너비", () => {
    it("type=datetime inset 시 고정 너비", () => {
      const { container } = render(() => <SdDateTimeField type="datetime" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("min-w-[14em]");
    });

    it("type=datetime-sec inset 시 고정 너비", () => {
      const { container } = render(() => <SdDateTimeField type="datetime-sec" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("min-w-[14em]");
    });
  });

  describe("Variants", () => {
    it("size=sm 적용", () => {
      const { container } = render(() => <SdDateTimeField type="datetime" size="sm" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-sm");
      expect(input?.className).toContain("py-ctrl-xs");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdDateTimeField type="datetime" theme="primary" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("bg-primary/15");
    });
  });
});
