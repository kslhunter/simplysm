import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { CheckBox } from "../../../../src/components/form-control/checkbox/CheckBox";

describe("CheckBox 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("checkbox role로 렌더링된다", () => {
      const { getByRole } = render(() => <CheckBox />);
      expect(getByRole("checkbox")).toBeTruthy();
    });

    it("children이 라벨로 표시된다", () => {
      const { getByText } = render(() => <CheckBox>동의합니다</CheckBox>);
      expect(getByText("동의합니다")).toBeTruthy();
    });

    it("기본값은 unchecked이다", () => {
      const { getByRole } = render(() => <CheckBox />);
      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("클릭 동작", () => {
    it("클릭하면 checked 상태가 토글된다", () => {
      const { getByRole } = render(() => <CheckBox />);
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);
      expect(checkbox.getAttribute("aria-checked")).toBe("true");

      fireEvent.click(checkbox);
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });

    it("disabled 상태에서는 클릭해도 변경되지 않는다", () => {
      const { getByRole } = render(() => <CheckBox disabled />);
      const checkbox = getByRole("checkbox");

      fireEvent.click(checkbox);
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("키보드 동작", () => {
    it("Space 키로 토글된다", () => {
      const { getByRole } = render(() => <CheckBox />);
      const checkbox = getByRole("checkbox");

      fireEvent.keyDown(checkbox, { key: " " });
      expect(checkbox.getAttribute("aria-checked")).toBe("true");

      fireEvent.keyDown(checkbox, { key: " " });
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 checked 상태로 반영된다", () => {
      const { getByRole } = render(() => <CheckBox value={true} />);
      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
    });

    it("onValueChange가 클릭 시 호출된다", () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => <CheckBox value={false} onValueChange={handleChange} />);

      fireEvent.click(getByRole("checkbox"));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("외부 상태 변경 시 업데이트된다", () => {
      const [value, setValue] = createSignal(false);
      const { getByRole } = render(() => <CheckBox value={value()} onValueChange={setValue} />);

      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("false");

      setValue(true);
      expect(getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("스타일 변형", () => {
    it("theme prop에 따라 스타일이 달라진다", () => {
      const { getByRole: getDefault } = render(() => <CheckBox value={true} />);
      const { getByRole: getDanger } = render(() => <CheckBox value={true} theme="danger" />);

      const defaultIndicator = getDefault("checkbox").querySelector("div") as HTMLElement;
      const dangerIndicator = getDanger("checkbox").querySelector("div") as HTMLElement;
      expect(defaultIndicator.className).not.toBe(dangerIndicator.className);
    });

    it("size prop에 따라 스타일이 달라진다", () => {
      const { getByRole: getDefault } = render(() => <CheckBox />);
      const { getByRole: getSm } = render(() => <CheckBox size="sm" />);

      expect(getDefault("checkbox").className).not.toBe(getSm("checkbox").className);
    });

    it("inset prop에 따라 스타일이 달라진다", () => {
      const { getByRole: getDefault } = render(() => <CheckBox />);
      const { getByRole: getInset } = render(() => <CheckBox inset />);

      expect(getDefault("checkbox").className).not.toBe(getInset("checkbox").className);
    });

    it("disabled 스타일이 적용된다", () => {
      const { getByRole } = render(() => <CheckBox disabled />);
      expect(getByRole("checkbox").classList.contains("opacity-50")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { getByRole } = render(() => <CheckBox class="my-custom-class" />);
      expect(getByRole("checkbox").classList.contains("my-custom-class")).toBe(true);
    });
  });
});
