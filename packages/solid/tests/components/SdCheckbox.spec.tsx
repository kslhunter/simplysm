import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdCheckbox } from "../../src/components/SdCheckbox";

describe("SdCheckbox", () => {
  afterEach(() => {
    cleanup();
  });

  describe("기본 기능", () => {
    it("기본 렌더링", () => {
      const { getByRole } = render(() => <SdCheckbox>테스트 체크박스</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox).toBeDefined();
      expect(checkbox.textContent).toContain("테스트 체크박스");
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });

    it("클릭 시 체크 상태 토글", async () => {
      const { getByRole } = render(() => <SdCheckbox>체크</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox.getAttribute("aria-checked")).toBe("true");
      });

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox.getAttribute("aria-checked")).toBe("false");
      });
    });

    it("Space 키로 체크 상태 토글", async () => {
      const { getByRole } = render(() => <SdCheckbox>체크</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("aria-checked")).toBe("false");

      fireEvent.keyDown(checkbox, { key: " " });
      await waitFor(() => {
        expect(checkbox.getAttribute("aria-checked")).toBe("true");
      });

      fireEvent.keyDown(checkbox, { key: " " });
      await waitFor(() => {
        expect(checkbox.getAttribute("aria-checked")).toBe("false");
      });
    });

    it("disabled 상태에서 클릭 무시", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <SdCheckbox disabled onChange={handleChange}>
          비활성
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("aria-disabled")).toBe("true");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(handleChange).not.toHaveBeenCalled();
      });
    });
  });

  describe("Controlled/Uncontrolled", () => {
    it("controlled 모드: value + onChange", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <SdCheckbox value={true} onChange={handleChange}>
          Controlled
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("aria-checked")).toBe("true");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(false);
      });
    });

    it("controlled 모드: 외부 상태에 의해 체크 상태 결정", async () => {
      const [checked, setChecked] = createSignal(false);
      const { getByRole } = render(() => (
        <SdCheckbox value={checked()} onChange={setChecked}>
          Controlled
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox.getAttribute("aria-checked")).toBe("true");
      });
    });

    it("uncontrolled 모드: defaultValue", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <SdCheckbox defaultValue={true} onChange={handleChange}>
          Uncontrolled
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("aria-checked")).toBe("true");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox.getAttribute("aria-checked")).toBe("false");
        expect(handleChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("canChangeFn", () => {
    it("canChangeFn이 false 반환 시 변경 차단", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <SdCheckbox canChangeFn={() => false} onChange={handleChange}>
          차단
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(handleChange).not.toHaveBeenCalled();
        expect(checkbox.getAttribute("aria-checked")).toBe("false");
      });
    });

    it("canChangeFn이 true 반환 시 변경 허용", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <SdCheckbox canChangeFn={() => true} onChange={handleChange}>
          허용
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(true);
      });
    });

    it("canChangeFn async 지원", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <SdCheckbox canChangeFn={() => Promise.resolve(true)} onChange={handleChange}>
          비동기
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(true);
      });
    });

    it("canChangeFn async false 반환 시 변경 차단", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <SdCheckbox canChangeFn={() => Promise.resolve(false)} onChange={handleChange}>
          비동기 차단
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(handleChange).not.toHaveBeenCalled();
      });
    });
  });

  describe("Variants", () => {
    it("theme prop 적용 - checked 상태", () => {
      const { getByRole } = render(() => (
        <SdCheckbox theme="success" defaultValue={true}>
          Success
        </SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");
      const indicator = checkbox.querySelector("div");

      expect(indicator?.className).toContain("bg-success");
    });

    it("theme prop - unchecked 상태에서는 기본 배경", () => {
      const { getByRole } = render(() => <SdCheckbox theme="success">Success</SdCheckbox>);
      const checkbox = getByRole("checkbox");
      const indicator = checkbox.querySelector("div");

      expect(indicator?.className).toContain("bg-bg-elevated");
    });

    it("size prop 적용 - sm", () => {
      const { getByRole } = render(() => <SdCheckbox size="sm">Small</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.className).toContain("px-ctrl-sm");
      expect(checkbox.className).toContain("py-ctrl-xs");
    });

    it("size prop 적용 - lg", () => {
      const { getByRole } = render(() => <SdCheckbox size="lg">Large</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.className).toContain("px-ctrl-lg");
      expect(checkbox.className).toContain("py-ctrl");
    });

    it("inline prop 적용", () => {
      const { getByRole } = render(() => <SdCheckbox inline>Inline</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.className).toContain("p-0");
      expect(checkbox.className).toContain("border-none");
    });

    it("inset prop 적용", () => {
      const { getByRole } = render(() => <SdCheckbox inset>Inset</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.className).toContain("border-none");
      expect(checkbox.className).toContain("justify-center");
    });
  });

  describe("접근성", () => {
    it("role=checkbox 설정", () => {
      const { getByRole } = render(() => <SdCheckbox>접근성</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("role")).toBe("checkbox");
    });

    it("aria-checked 상태 반영", async () => {
      const { getByRole } = render(() => <SdCheckbox>접근성</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(checkbox.getAttribute("aria-checked")).toBe("true");
      });
    });

    it("tabindex 설정", () => {
      const { getByRole } = render(() => <SdCheckbox>접근성</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.getAttribute("tabindex")).toBe("0");
    });

    it("disabled 상태에서 tabindex 미설정", () => {
      const { getByRole } = render(() => <SdCheckbox disabled>비활성</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.hasAttribute("tabindex")).toBe(false);
    });
  });

  describe("Ripple", () => {
    it("클릭 시 ripple 효과", () => {
      const { getByRole } = render(() => <SdCheckbox>Ripple</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      fireEvent.pointerDown(checkbox, { clientX: 50, clientY: 50 });

      const rippleEl = checkbox.querySelector("span");
      expect(rippleEl).toBeDefined();
    });

    it("disabled 상태에서 ripple 비활성화", () => {
      const { getByRole } = render(() => <SdCheckbox disabled>비활성</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      fireEvent.pointerDown(checkbox, { clientX: 50, clientY: 50 });

      const rippleEl = checkbox.querySelector("span");
      expect(rippleEl).toBeNull();
    });
  });

  describe("기타", () => {
    it("커스텀 class 병합", () => {
      const { getByRole } = render(() => <SdCheckbox class="custom-class">커스텀</SdCheckbox>);
      const checkbox = getByRole("checkbox");

      expect(checkbox.className).toContain("custom-class");
    });

    it("contentStyle 적용", () => {
      const { getByRole } = render(() => (
        <SdCheckbox contentStyle={{ color: "red" }}>스타일</SdCheckbox>
      ));
      const checkbox = getByRole("checkbox");
      const contentDiv = checkbox.querySelectorAll("div")[1];

      expect(contentDiv.style.color).toBe("red");
    });

    it("children 없이 렌더링", () => {
      const { getByRole } = render(() => <SdCheckbox />);
      const checkbox = getByRole("checkbox");

      // indicator만 존재
      expect(checkbox.querySelectorAll("div").length).toBe(1);
    });
  });
});
