import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdFormatField } from "../../src/components/SdFormatField";

describe("SdFormatField", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("기본 렌더링", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" placeholder="전화번호" />);
      const input = container.querySelector("input");

      expect(input).toBeDefined();
      expect(input?.getAttribute("type")).toBe("text");
      expect(input?.getAttribute("placeholder")).toBe("전화번호");
    });

    it("입력 시 구분자 제거된 값 저장", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" onChange={handleChange} />);
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "010-1234-5678" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("01012345678");
      });
    });

    it("빈 값 입력 시 undefined 반환", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdFormatField format="XXX-XXXX-XXXX" defaultValue="01012345678" onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe("포맷 변환", () => {
    it("순수 값 → 포맷팅된 값 표시", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" defaultValue="01012345678" />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("010-1234-5678");
    });

    it("다중 포맷 지원 - 짧은 번호 (9자리)", () => {
      const { container } = render(() => <SdFormatField format="XX-XXX-XXXX|XXX-XXXX-XXXX" defaultValue="021234567" />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("02-123-4567");
    });

    it("다중 포맷 지원 - 긴 번호 (11자리)", () => {
      const { container } = render(() => (
        <SdFormatField format="XX-XXX-XXXX|XXX-XXXX-XXXX" defaultValue="01012345678" />
      ));
      const input = container.querySelector("input")!;

      expect(input.value).toBe("010-1234-5678");
    });

    it("사업자등록번호 포맷", () => {
      const { container } = render(() => <SdFormatField format="XXX-XX-XXXXX" defaultValue="1234567890" />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("123-45-67890");
    });

    it("매칭되는 포맷 없으면 원본 표시", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" defaultValue="123" />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("123");
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드", async () => {
      const [value, setValue] = createSignal<string | undefined>("01012345678");
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" value={value()} onChange={setValue} />);
      const input = container.querySelector("input")!;

      expect(input.value).toBe("010-1234-5678");

      fireEvent.input(input, { target: { value: "010-9876-5432" } });

      await waitFor(() => {
        expect(input.value).toBe("010-9876-5432");
      });
    });

    it("uncontrolled 모드", async () => {
      const handleChange = vi.fn();
      const { container } = render(() => (
        <SdFormatField format="XXX-XXXX-XXXX" defaultValue="01012345678" onChange={handleChange} />
      ));
      const input = container.querySelector("input")!;

      fireEvent.input(input, { target: { value: "010-9999-8888" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("01099998888");
      });
    });
  });

  describe("readonly/disabled", () => {
    it("disabled 상태", () => {
      const { container } = render(() => (
        <SdFormatField format="XXX-XXXX-XXXX" disabled defaultValue="01012345678" />
      ));
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("010-1234-5678");
    });

    it("readonly 상태", () => {
      const { container } = render(() => (
        <SdFormatField format="XXX-XXXX-XXXX" readonly defaultValue="01012345678" />
      ));
      const input = container.querySelector("input");
      const display = container.querySelector("div > div");

      expect(input).toBeNull();
      expect(display?.textContent).toBe("010-1234-5678");
    });

    it("빈 값 readonly 시 placeholder 표시", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" readonly placeholder="전화번호" />);
      const display = container.querySelector("div > div");

      expect(display?.textContent).toBe("전화번호");
    });
  });

  describe("Variants", () => {
    it("size=sm 적용", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" size="sm" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-sm");
      expect(input?.className).toContain("py-ctrl-xs");
    });

    it("size=lg 적용", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" size="lg" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("px-ctrl-lg");
      expect(input?.className).toContain("py-ctrl");
    });

    it("theme prop 적용", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" theme="primary" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("bg-primary/15");
    });

    it("inline prop 적용", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" inline />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("inline-block");
    });

    it("inset prop 적용", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" inset />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("border-none");
      expect(input?.className).toContain("rounded-none");
    });
  });

  describe("커스텀 스타일", () => {
    it("inputClass 적용", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" inputClass="custom-input" />);
      const input = container.querySelector("input");

      expect(input?.className).toContain("custom-input");
    });

    it("inputStyle 적용", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" inputStyle={{ color: "red" }} />);
      const input = container.querySelector("input");

      expect(input?.style.color).toBe("red");
    });

    it("class 적용 (container)", () => {
      const { container } = render(() => <SdFormatField format="XXX-XXXX-XXXX" class="
        custom-container
      " />);
      const wrapper = container.querySelector("div");

      expect(wrapper?.className).toContain("custom-container");
    });
  });
});
