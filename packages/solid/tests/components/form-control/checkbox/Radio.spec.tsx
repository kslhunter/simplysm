import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Radio } from "../../../../src/components/form-control/checkbox/Radio";

describe("Radio 컴포넌트", () => {
  describe("basic rendering", () => {
    it("radio role로 렌더링된다", () => {
      const { getByRole } = render(() => <Radio />);
      expect(getByRole("radio")).toBeTruthy();
    });

    it("children이 라벨로 표시된다", () => {
      const { getByText } = render(() => <Radio>옵션 A</Radio>);
      expect(getByText("옵션 A")).toBeTruthy();
    });

    it("기본값은 unchecked이다", () => {
      const { getByRole } = render(() => <Radio />);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("click behavior", () => {
    it("클릭하면 선택된다", () => {
      const { getByRole } = render(() => <Radio />);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });

    it("이미 선택된 상태에서 다시 클릭해도 선택 해제되지 않는다", () => {
      const { getByRole } = render(() => <Radio value={true} />);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });

    it("disabled 상태에서는 클릭해도 변경되지 않는다", () => {
      const { getByRole } = render(() => <Radio disabled />);
      const radio = getByRole("radio");

      fireEvent.click(radio);
      expect(radio.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("키보드 동작", () => {
    it("Space 키로 선택된다", () => {
      const { getByRole } = render(() => <Radio />);
      const radio = getByRole("radio");

      fireEvent.keyDown(radio, { key: " " });
      expect(radio.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 checked 상태로 반영된다", () => {
      const { getByRole } = render(() => <Radio value={true} />);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });

    it("onValueChange가 클릭 시 호출된다", () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => <Radio value={false} onValueChange={handleChange} />);

      fireEvent.click(getByRole("radio"));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("외부 상태 변경 시 업데이트된다", () => {
      const [value, setValue] = createSignal(false);
      const { getByRole } = render(() => <Radio value={value()} onValueChange={setValue} />);

      expect(getByRole("radio").getAttribute("aria-checked")).toBe("false");

      setValue(true);
      expect(getByRole("radio").getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("스타일 변형", () => {
    it("인디케이터가 원형이다", () => {
      const { getByRole } = render(() => <Radio />);
      const indicator = getByRole("radio").querySelector("div") as HTMLElement;
      expect(indicator.classList.contains("rounded-full")).toBe(true);
    });

    it("size prop에 따라 스타일이 달라진다", () => {
      const { getByRole: getDefault } = render(() => <Radio />);
      const { getByRole: getSm } = render(() => <Radio size="sm" />);

      expect(getDefault("radio").className).not.toBe(getSm("radio").className);
    });

    it("disabled 스타일이 적용된다", () => {
      const { getByRole } = render(() => <Radio disabled />);
      expect(getByRole("radio").classList.contains("opacity-30")).toBe(true);
    });
  });

  describe("class merging", () => {
    it("merges custom classes", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { getByRole } = render(() => <Radio class="my-custom-class" />);
      expect(getByRole("radio").classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("validation", () => {
    it("required일 때 선택되지 않으면 에러 메시지가 설정된다", () => {
      const { container } = render(() => <Radio required value={false} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required selection");
    });

    it("required일 때 선택되면 유효하다", () => {
      const { container } = render(() => <Radio required value={true} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("validate 함수가 에러 메시지를 반환하면 설정된다", () => {
      const { container } = render(() => <Radio value={true} validate={() => "커스텀 에러"} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("커스텀 에러");
    });

    it("validate 함수가 undefined를 반환하면 유효하다", () => {
      const { container } = render(() => <Radio value={true} validate={() => undefined} />);
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
