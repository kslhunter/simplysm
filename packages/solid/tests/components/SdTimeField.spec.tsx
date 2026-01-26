import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Time } from "@simplysm/core-common";
import { SdTimeField } from "../../src/components/SdTimeField";

describe("SdTimeField", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("type=time 렌더링", () => {
      const { container } = render(() => <SdTimeField type="time" />);
      const input = container.querySelector("input");

      expect(input).toBeDefined();
      expect(input?.getAttribute("type")).toBe("time");
      expect(input?.getAttribute("step")).toBe("any");
    });

    it("type=time-sec 렌더링 (step=1)", () => {
      const { container } = render(() => <SdTimeField type="time-sec" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("step")).toBe("1");
    });

    it("시간 입력 시 값 변경", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdTimeField type="time" onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "10:30:00" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
      });
      const result = handleChange.mock.calls[0][0] as Time;
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
    });

    it("빈 값 입력 시 undefined 반환", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdTimeField type="time" defaultValue={new Time(10, 30)} onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("type별 포맷", () => {
    it("type=time: HH:mm 포맷", () => {
      const { container } = render(() => <SdTimeField type="time" defaultValue={new Time(10, 30)} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("10:30");
    });

    it("type=time-sec: HH:mm:ss 포맷", () => {
      const { container } = render(() => <SdTimeField type="time-sec" defaultValue={new Time(10, 30, 45)} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("10:30:45");
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드", async () => {
      const [time, setTime] = createSignal<Time | undefined>(new Time(9, 0));
      const { container } = render(() => <SdTimeField type="time" value={time()} onChange={setTime} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("09:00");

      fireEvent.input(input, { target: { value: "18:30:00" } });

      await waitFor(() => {
        const currentTime = time();
        expect(currentTime?.hour).toBe(18);
      });
    });

    it("uncontrolled 모드", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdTimeField type="time" defaultValue={new Time(9, 0)} onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "14:15:00" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
      });
      const result = handleChange.mock.calls[0][0] as Time;
      expect(result.hour).toBe(14);
      expect(result.minute).toBe(15);
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태 - 오전/오후 포맷 표시", () => {
      const { container } = render(() => <SdTimeField type="time" disabled defaultValue={new Time(10, 30)} />);
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("오전 10:30");
    });

    it("readonly 상태 - 오후 시간", () => {
      const { container } = render(() => <SdTimeField type="time" readonly defaultValue={new Time(14, 30)} />);
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("오후 02:30");
    });

    it("readonly 상태 - time-sec 포맷", () => {
      const { container } = render(() => <SdTimeField type="time-sec" readonly defaultValue={new Time(14, 30, 45)} />);
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("오후 02:30:45");
    });
  });

  describe("inset 고정 너비", () => {
    it("type=time inset 시 고정 너비", () => {
      const { container } = render(() => <SdTimeField type="time" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("min-w-[8.25em]");
    });

    it("type=time-sec inset 시 고정 너비", () => {
      const { container } = render(() => <SdTimeField type="time-sec" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("min-w-[7em]");
    });
  });

  describe("Variants", () => {
    it("size=sm 적용", () => {
      const { container } = render(() => <SdTimeField type="time" size="sm" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-sm");
      expect(input?.className).toContain("py-ctrl-xs");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdTimeField type="time" theme="primary" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("bg-primary/15");
    });
  });
});
