import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { CheckboxGroup } from "../../../../src/components/form-control/checkbox/CheckboxGroup";

describe("CheckboxGroup 컴포넌트", () => {
  describe("basic rendering", () => {
    it("컨테이너가 렌더링된다", () => {
      const { container } = render(() => (
        <CheckboxGroup>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(container.querySelector("div")).toBeTruthy();
    });

    it("아이템이 체크박스로 렌더링된다", () => {
      const { getAllByRole } = render(() => (
        <CheckboxGroup>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
          <CheckboxGroup.Item value="b">B</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getAllByRole("checkbox").length).toBe(2);
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 선택 상태로 반영된다", () => {
      const { getAllByRole } = render(() => (
        <CheckboxGroup value={["a"]}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
          <CheckboxGroup.Item value="b">B</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      const checkboxes = getAllByRole("checkbox");
      expect(checkboxes[0].getAttribute("aria-checked")).toBe("true");
      expect(checkboxes[1].getAttribute("aria-checked")).toBe("false");
    });

    it("onValueChange가 토글 시 호출된다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <CheckboxGroup value={[]} onValueChange={handleChange}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      fireEvent.click(getAllByRole("checkbox")[0]);
      expect(handleChange).toHaveBeenCalledWith(["a"]);
    });

    it("외부 상태 변경 시 업데이트된다", () => {
      const [value, setValue] = createSignal<string[]>([]);
      const { getAllByRole } = render(() => (
        <CheckboxGroup value={value()} onValueChange={setValue}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getAllByRole("checkbox")[0].getAttribute("aria-checked")).toBe("false");
      setValue(["a"]);
      expect(getAllByRole("checkbox")[0].getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("validation", () => {
    // 그룹의 Invalid hidden input은 자식 Checkbox들의 hidden input들보다 뒤에 위치한다
    const getGroupHiddenInput = (container: HTMLElement) => {
      const inputs = container.querySelectorAll("input[aria-hidden='true']");
      return inputs[inputs.length - 1] as HTMLInputElement;
    };

    it("required일 때 선택 항목이 없으면 에러 메시지가 설정된다", () => {
      const { container } = render(() => (
        <CheckboxGroup required value={[]}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("Please select an item");
    });

    it("required일 때 선택 항목이 있으면 유효하다", () => {
      const { container } = render(() => (
        <CheckboxGroup required value={["a"]}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });

    it("validate 함수가 에러 메시지를 반환하면 설정된다", () => {
      const { container } = render(() => (
        <CheckboxGroup value={["a"]} validate={() => "커스텀 에러"}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validationMessage).toBe("커스텀 에러");
    });

    it("validate 함수가 undefined를 반환하면 유효하다", () => {
      const { container } = render(() => (
        <CheckboxGroup value={["a"]} validate={() => undefined}>
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
        </CheckboxGroup>
      ));
      expect(getGroupHiddenInput(container).validity.valid).toBe(true);
    });
  });
});
