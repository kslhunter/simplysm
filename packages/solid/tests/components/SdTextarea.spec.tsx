import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdTextarea } from "../../src/components/SdTextarea";

describe("SdTextarea", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("기본 렌더링", () => {
      const { container } = render(() => <SdTextarea placeholder="입력하세요" />);
      const textarea = container.querySelector("textarea");

      expect(textarea).toBeDefined();
      expect(textarea?.getAttribute("placeholder")).toBe("입력하세요");
    });

    it("입력 시 값 변경", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdTextarea onChange={handleChange} />);
      const textarea = container.querySelector("textarea")!;

      fireEvent.input(textarea, { target: { value: "테스트" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("테스트");
      });
    });

    it("빈 값 입력 시 undefined 반환", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdTextarea defaultValue="초기값" onChange={handleChange} />);
      const textarea = container.querySelector("textarea")!;

      fireEvent.input(textarea, { target: { value: "" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드: value + onChange", async () => {
      const [value, setValue] = createSignal("초기값");
      const { container } = render(() => <SdTextarea value={value()} onChange={setValue} />);
      const textarea = container.querySelector("textarea")!;

      expect(textarea.value).toBe("초기값");

      fireEvent.input(textarea, { target: { value: "변경된 값" } });

      await waitFor(() => {
        expect(textarea.value).toBe("변경된 값");
      });
    });

    it("uncontrolled 모드: defaultValue", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdTextarea defaultValue="초기값" onChange={handleChange} />);
      const textarea = container.querySelector("textarea")!;

      expect(textarea.value).toBe("초기값");

      fireEvent.input(textarea, { target: { value: "변경" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("변경");
      });
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태", () => {
      const { container } = render(() => <SdTextarea disabled defaultValue="비활성" />);

      // textarea가 아닌 div로 렌더링되어야 함
      const textarea = container.querySelector("textarea");
      const display = container.querySelector("div > div");

      expect(textarea).toBeNull();
      expect(display?.textContent).toBe("비활성");
    });

    it("readonly 상태", () => {
      const { container } = render(() => <SdTextarea readonly defaultValue="읽기전용" />);

      const textarea = container.querySelector("textarea");
      const display = container.querySelector("div > div");

      expect(textarea).toBeNull();
      expect(display?.textContent).toBe("읽기전용");
    });

    it("빈 값 readonly 시 placeholder 표시", () => {
      const { container } = render(() => <SdTextarea readonly placeholder="플레이스홀더" />);
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("플레이스홀더");
    });
  });

  describe("자동 높이 조절", () => {
    it("minRows 기본값 적용 (rows=1)", () => {
      const { container } = render(() => <SdTextarea />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.getAttribute("rows")).toBe("1");
    });

    it("minRows 지정 시 적용", () => {
      const { container } = render(() => <SdTextarea minRows={3} />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.getAttribute("rows")).toBe("3");
    });

    it("줄바꿈 수에 따라 rows 증가", () => {
      const { container } = render(() => <SdTextarea defaultValue={"라인1\n라인2\n라인3"} />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.getAttribute("rows")).toBe("3");
    });

    it("줄바꿈 수가 minRows보다 작으면 minRows 유지", () => {
      const { container } = render(() => <SdTextarea minRows={5} defaultValue={"라인1\n라인2"} />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.getAttribute("rows")).toBe("5");
    });

    it("줄바꿈 수가 minRows보다 크면 줄바꿈 수 적용", () => {
      const { container } = render(() => <SdTextarea minRows={2} defaultValue={"라인1\n라인2\n라인3\n라인4"} />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.getAttribute("rows")).toBe("4");
    });
  });

  describe("Variants", () => {
    it("size=sm 적용", () => {
      const { container } = render(() => <SdTextarea size="sm" />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.className).toContain("px-ctrl-sm");
      expect(textarea?.className).toContain("py-ctrl-xs");
    });

    it("size=lg 적용", () => {
      const { container } = render(() => <SdTextarea size="lg" />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.className).toContain("px-ctrl-lg");
      expect(textarea?.className).toContain("py-ctrl");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdTextarea theme="primary" />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.className).toContain("bg-primary/15");
    });

    it("inline prop 적용", () => {
      const { container } = render(() => <SdTextarea inline />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("inline-block");
    });

    it("inset prop 적용", () => {
      const { container } = render(() => <SdTextarea inset />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.className).toContain("border-none");
      expect(textarea?.className).toContain("rounded-none");
    });
  });

  describe("속성", () => {
    it("required 적용", () => {
      const { container } = render(() => <SdTextarea required />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.getAttribute("required")).not.toBeNull();
    });

    it("resize-none 적용", () => {
      const { container } = render(() => <SdTextarea />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.className).toContain("resize-none");
    });
  });

  describe("커스텀 스타일", () => {
    it("inputClass 적용", () => {
      const { container } = render(() => <SdTextarea inputClass="custom-input" />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.className).toContain("custom-input");
    });

    it("inputStyle 적용", () => {
      const { container } = render(() => <SdTextarea inputStyle={{ color: "red" }} />);
      const textarea = container.querySelector("textarea");

      expect(textarea?.style.color).toBe("red");
    });

    it("class 적용 (container)", () => {
      const { container } = render(() => <SdTextarea class="custom-container" />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("custom-container");
    });
  });

  describe("여러 줄 텍스트 표시", () => {
    it("readonly 상태에서 여러 줄 텍스트 표시", () => {
      const { container } = render(() => <SdTextarea readonly defaultValue={"라인1\n라인2\n라인3"} />);
      const pre = container.querySelector("pre");

      expect(pre).not.toBeNull();
      expect(pre?.textContent).toBe("라인1\n라인2\n라인3");
    });

    it("disabled 상태에서 여러 줄 텍스트 표시", () => {
      const { container } = render(() => <SdTextarea disabled defaultValue={"라인1\n라인2"} />);
      const pre = container.querySelector("pre");

      expect(pre).not.toBeNull();
      expect(pre?.textContent).toBe("라인1\n라인2");
    });
  });
});
