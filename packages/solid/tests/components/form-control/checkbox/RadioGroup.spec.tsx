import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { RadioGroup } from "../../../../src/components/form-control/checkbox/RadioGroup";

describe("RadioGroup 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("컨테이너가 렌더링된다", () => {
      const { container } = render(() => (
        <RadioGroup>
          <RadioGroup.Item value="a">A</RadioGroup.Item>
        </RadioGroup>
      ));
      expect(container.querySelector("div")).toBeTruthy();
    });

    it("아이템이 radio로 렌더링된다", () => {
      const { getAllByRole } = render(() => (
        <RadioGroup>
          <RadioGroup.Item value="a">A</RadioGroup.Item>
          <RadioGroup.Item value="b">B</RadioGroup.Item>
        </RadioGroup>
      ));
      expect(getAllByRole("radio").length).toBe(2);
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 선택 상태로 반영된다", () => {
      const { getAllByRole } = render(() => (
        <RadioGroup value="a">
          <RadioGroup.Item value="a">A</RadioGroup.Item>
          <RadioGroup.Item value="b">B</RadioGroup.Item>
        </RadioGroup>
      ));
      const radios = getAllByRole("radio");
      expect(radios[0].getAttribute("aria-checked")).toBe("true");
      expect(radios[1].getAttribute("aria-checked")).toBe("false");
    });

    it("onValueChange가 선택 시 호출된다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <RadioGroup value={undefined} onValueChange={handleChange}>
          <RadioGroup.Item value="a">A</RadioGroup.Item>
        </RadioGroup>
      ));
      fireEvent.click(getAllByRole("radio")[0]);
      expect(handleChange).toHaveBeenCalledWith("a");
    });

    it("외부 상태 변경 시 업데이트된다", () => {
      const [value, setValue] = createSignal<string | undefined>(undefined);
      const { getAllByRole } = render(() => (
        <RadioGroup value={value()} onValueChange={setValue}>
          <RadioGroup.Item value="a">A</RadioGroup.Item>
        </RadioGroup>
      ));
      expect(getAllByRole("radio")[0].getAttribute("aria-checked")).toBe("false");
      setValue("a");
      expect(getAllByRole("radio")[0].getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("validation", () => {
    // 그룹의 Invalid hidden input은 자식 Radio들의 hidden input들보다 뒤에 위치한다
    const getGroupHiddenInput = (container: HTMLElement) => {
      const inputs = container.querySelectorAll("input[aria-hidden='true']");
      return inputs[inputs.length - 1] as HTMLInputElement;
    };

    it("required일 때 선택 항목이 없으면 에러 메시지가 설정된다", () => {
      const { container } = render(() => (
        <RadioGroup required value={undefined}>
          <RadioGroup.Item value="a">A</RadioGroup.Item>
        </RadioGroup>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("항목을 선택해 주세요");
    });

    it("required일 때 선택 항목이 있으면 유효하다", () => {
      const { container } = render(() => (
        <RadioGroup required value="a">
          <RadioGroup.Item value="a">A</RadioGroup.Item>
        </RadioGroup>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });

    it("validate 함수가 에러 메시지를 반환하면 설정된다", () => {
      const { container } = render(() => (
        <RadioGroup value="a" validate={() => "커스텀 에러"}>
          <RadioGroup.Item value="a">A</RadioGroup.Item>
        </RadioGroup>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("커스텀 에러");
    });

    it("validate 함수가 undefined를 반환하면 유효하다", () => {
      const { container } = render(() => (
        <RadioGroup value="a" validate={() => undefined}>
          <RadioGroup.Item value="a">A</RadioGroup.Item>
        </RadioGroup>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });
  });
});
