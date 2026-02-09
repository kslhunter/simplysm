import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Tab } from "../../../src/components/navigation/Tab";

describe("Tab 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("tablist role로 렌더링된다", () => {
      const { getByRole } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
        </Tab>
      ));
      expect(getByRole("tablist")).toBeTruthy();
    });

    it("Tab.Item이 tab role로 렌더링된다", () => {
      const { getByRole } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
        </Tab>
      ));
      expect(getByRole("tab")).toBeTruthy();
    });

    it("children이 표시된다", () => {
      const { getByText } = render(() => (
        <Tab>
          <Tab.Item value="a">탭 A</Tab.Item>
          <Tab.Item value="b">탭 B</Tab.Item>
        </Tab>
      ));
      expect(getByText("탭 A")).toBeTruthy();
      expect(getByText("탭 B")).toBeTruthy();
    });
  });

  describe("선택 동작", () => {
    it("클릭하면 aria-selected가 true가 된다", () => {
      const { getAllByRole } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b">B</Tab.Item>
        </Tab>
      ));
      const tabs = getAllByRole("tab");

      fireEvent.click(tabs[0]);
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
      expect(tabs[1].getAttribute("aria-selected")).toBe("false");
    });

    it("다른 탭 클릭 시 선택이 변경된다", () => {
      const { getAllByRole } = render(() => (
        <Tab value="a">
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b">B</Tab.Item>
        </Tab>
      ));
      const tabs = getAllByRole("tab");

      fireEvent.click(tabs[1]);
      expect(tabs[1].getAttribute("aria-selected")).toBe("true");
      expect(tabs[0].getAttribute("aria-selected")).toBe("false");
    });

    it("disabled 탭은 클릭해도 선택되지 않는다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <Tab onValueChange={handleChange}>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b" disabled>B</Tab.Item>
        </Tab>
      ));

      fireEvent.click(getAllByRole("tab")[1]);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("키보드 동작", () => {
    it("Space 키로 선택된다", () => {
      const { getAllByRole } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b">B</Tab.Item>
        </Tab>
      ));

      fireEvent.keyDown(getAllByRole("tab")[0], { key: " " });
      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");
    });

    it("Enter 키로 선택된다", () => {
      const { getAllByRole } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b">B</Tab.Item>
        </Tab>
      ));

      fireEvent.keyDown(getAllByRole("tab")[1], { key: "Enter" });
      expect(getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 선택 상태로 반영된다", () => {
      const { getAllByRole } = render(() => (
        <Tab value="b">
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b">B</Tab.Item>
        </Tab>
      ));

      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("false");
      expect(getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
    });

    it("onValueChange가 클릭 시 호출된다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <Tab value="a" onValueChange={handleChange}>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b">B</Tab.Item>
        </Tab>
      ));

      fireEvent.click(getAllByRole("tab")[1]);
      expect(handleChange).toHaveBeenCalledWith("b");
    });

    it("외부 상태 변경 시 업데이트된다", () => {
      const [value, setValue] = createSignal("a");
      const { getAllByRole } = render(() => (
        <Tab value={value()} onValueChange={setValue}>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b">B</Tab.Item>
        </Tab>
      ));

      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");

      setValue("b");
      expect(getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("false");
    });
  });

  describe("사이즈", () => {
    it("size prop에 따라 스타일이 달라진다", () => {
      const { getAllByRole: getDefault } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
        </Tab>
      ));
      const { getAllByRole: getSm } = render(() => (
        <Tab size="sm">
          <Tab.Item value="a">A</Tab.Item>
        </Tab>
      ));

      expect(getDefault("tab")[0].className).not.toBe(getSm("tab")[0].className);
    });
  });

  describe("접근성", () => {
    it("disabled 탭에 aria-disabled가 설정된다", () => {
      const { getAllByRole } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b" disabled>B</Tab.Item>
        </Tab>
      ));

      expect(getAllByRole("tab")[1].getAttribute("aria-disabled")).toBe("true");
    });

    it("disabled 탭의 tabIndex가 -1이다", () => {
      const { getAllByRole } = render(() => (
        <Tab>
          <Tab.Item value="a">A</Tab.Item>
          <Tab.Item value="b" disabled>B</Tab.Item>
        </Tab>
      ));

      expect(getAllByRole("tab")[1].getAttribute("tabindex")).toBe("-1");
    });
  });

  describe("class 병합", () => {
    it("Tab에 사용자 정의 class가 병합된다", () => {
      const { getByRole } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Tab class="my-tab-class">
          <Tab.Item value="a">A</Tab.Item>
        </Tab>
      ));
      expect(getByRole("tablist").classList.contains("my-tab-class")).toBe(true);
    });

    it("Tab.Item에 사용자 정의 class가 병합된다", () => {
      const { getByRole } = render(() => (
        <Tab>
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <Tab.Item value="a" class="my-item-class">A</Tab.Item>
        </Tab>
      ));
      expect(getByRole("tab").classList.contains("my-item-class")).toBe(true);
    });
  });
});
