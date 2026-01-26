import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdColorField } from "../../src/components/SdColorField";

describe("SdColorField", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("기본 렌더링", () => {
      const { container } = render(() => <SdColorField />);
      const input = container.querySelector("input");

      expect(input).toBeDefined();
      expect(input?.getAttribute("type")).toBe("color");
    });

    it("기본값 #000000", () => {
      const { container } = render(() => <SdColorField />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("#000000");
    });

    it("색상 변경 시 값 업데이트", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdColorField onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "#ff0000" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("#ff0000");
      });
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드", async () => {
      const [color, setColor] = createSignal("#0000ff");
      const { container } = render(() => <SdColorField value={color()} onChange={setColor} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("#0000ff");

      fireEvent.input(input, { target: { value: "#00ff00" } });

      await waitFor(() => {
        expect(input.value).toBe("#00ff00");
      });
    });

    it("uncontrolled 모드", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdColorField defaultValue="#ff0000" onChange={handleChange} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("#ff0000");

      fireEvent.input(input, { target: { value: "#00ff00" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("#00ff00");
      });
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태 - 색상 미리보기 표시", () => {
      const { container } = render(() => <SdColorField disabled defaultValue="#ff0000" />);
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toContain("#ff0000");
    });

    it("readonly 상태 - 색상 미리보기 표시", () => {
      const { container } = render(() => <SdColorField readonly defaultValue="#00ff00" />);
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toContain("#00ff00");
    });
  });

  describe("Variants", () => {
    it("size=sm 적용", () => {
      const { container } = render(() => <SdColorField size="sm" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-sm");
      expect(input?.className).toContain("py-ctrl-xs");
    });

    it("size=lg 적용", () => {
      const { container } = render(() => <SdColorField size="lg" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-lg");
      expect(input?.className).toContain("py-ctrl");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdColorField theme="primary" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("bg-primary/15");
    });

    it("inline prop 적용", () => {
      const { container } = render(() => <SdColorField inline />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("inline-block");
    });

    it("inset prop 적용", () => {
      const { container } = render(() => <SdColorField inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("border-none");
      expect(input?.className).toContain("rounded-none");
    });
  });

  describe("커스텀 스타일", () => {
    it("inputClass 적용", () => {
      const { container } = render(() => <SdColorField inputClass="custom-input" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("custom-input");
    });

    it("class 적용 (container)", () => {
      const { container } = render(() => <SdColorField class="custom-container" />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("custom-container");
    });
  });
});
