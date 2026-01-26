import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdTextField } from "../../src/components/SdTextField";

describe("SdTextField", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("기본 렌더링", () => {
      const { container } = render(() => <SdTextField placeholder="입력하세요" />);
      const input = container.querySelector("input");

      expect(input).toBeDefined();
      expect(input?.getAttribute("type")).toBe("text");
      expect(input?.getAttribute("placeholder")).toBe("입력하세요");
    });

    it("type=password 렌더링", () => {
      const { container } = render(() => <SdTextField type="password" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("type")).toBe("password");
    });

    it("type=email 렌더링", () => {
      const { container } = render(() => <SdTextField type="email" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("type")).toBe("email");
    });

    it("입력 시 값 변경", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdTextField onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "테스트" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("테스트");
      });
    });

    it("빈 값 입력 시 undefined 반환", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdTextField defaultValue="초기값" onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드: value + onChange", async () => {
      const [value, setValue] = createSignal("초기값");
      const { container } = render(() => <SdTextField value={value()} onChange={setValue} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("초기값");

      fireEvent.input(input, { target: { value: "변경된 값" } });

      await waitFor(() => {
        expect(input.value).toBe("변경된 값");
      });
    });

    it("uncontrolled 모드: defaultValue", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdTextField defaultValue="초기값" onChange={handleChange} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("초기값");

      fireEvent.input(input, { target: { value: "변경" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("변경");
      });
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태", () => {
      const { container } = render(() => <SdTextField disabled defaultValue="비활성" />);

      // input이 아닌 div로 렌더링되어야 함
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("비활성");
    });

    it("readonly 상태", () => {
      const { container } = render(() => <SdTextField readonly defaultValue="읽기전용" />);

      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("읽기전용");
    });

    it("password readonly 시 **** 표시", () => {
      const { container } = render(() => <SdTextField type="password" readonly defaultValue="secret" />);
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("****");
    });

    it("빈 값 readonly 시 placeholder 표시", () => {
      const { container } = render(() => <SdTextField readonly placeholder="플레이스홀더" />);
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("플레이스홀더");
    });
  });

  describe("Variants", () => {
    it("size=sm 적용", () => {
      const { container } = render(() => <SdTextField size="sm" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-sm");
      expect(input?.className).toContain("py-ctrl-xs");
    });

    it("size=lg 적용", () => {
      const { container } = render(() => <SdTextField size="lg" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-lg");
      expect(input?.className).toContain("py-ctrl");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdTextField theme="primary" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("bg-primary/15");
    });

    it("inline prop 적용", () => {
      const { container } = render(() => <SdTextField inline />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("inline-block");
    });

    it("inset prop 적용", () => {
      const { container } = render(() => <SdTextField inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("border-none");
      expect(input?.className).toContain("rounded-none");
    });
  });

  describe("속성", () => {
    it("minLength/maxLength 적용", () => {
      const { container } = render(() => <SdTextField minLength={3} maxLength={10} />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("minLength")).toBe("3");
      expect(input?.getAttribute("maxLength")).toBe("10");
    });

    it("pattern 적용", () => {
      const { container } = render(() => <SdTextField pattern="[0-9]+" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("pattern")).toBe("[0-9]+");
    });

    it("autocomplete 적용", () => {
      const { container } = render(() => <SdTextField autocomplete="email" />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("autocomplete")).toBe("email");
    });

    it("required 적용", () => {
      const { container } = render(() => <SdTextField required />);
      const input = container.querySelector("input");

      expect(input?.getAttribute("required")).not.toBeNull();
    });
  });

  describe("커스텀 스타일", () => {
    it("inputClass 적용", () => {
      const { container } = render(() => <SdTextField inputClass="custom-input" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("custom-input");
    });

    it("inputStyle 적용", () => {
      const { container } = render(() => <SdTextField inputStyle={{ color: "red" }} />);
      const input = container.querySelector("input");

      expect(input?.style.color).toBe("red");
    });

    it("class 적용 (container)", () => {
      const { container } = render(() => <SdTextField class="custom-container" />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("custom-container");
    });
  });
});
