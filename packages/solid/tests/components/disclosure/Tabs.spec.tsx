import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Tabs } from "../../../src/components/disclosure/Tabs";

describe("Tabs 컴포넌트", () => {
  describe("basic rendering", () => {
    it("tablist role로 렌더링된다", () => {
      const { getByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));
      expect(getByRole("tablist")).toBeTruthy();
    });

    it("Tabs.Tab이 tab role로 렌더링된다", () => {
      const { getByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));
      expect(getByRole("tab")).toBeTruthy();
    });

    it("children이 표시된다", () => {
      const { getByText } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">탭 A</Tabs.Tab>
          <Tabs.Tab value="b">탭 B</Tabs.Tab>
        </Tabs>
      ));
      expect(getByText("탭 A")).toBeTruthy();
      expect(getByText("탭 B")).toBeTruthy();
    });
  });

  describe("선택 동작", () => {
    it("클릭하면 aria-selected가 true가 된다", () => {
      const { getAllByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));
      const tabs = getAllByRole("tab");

      fireEvent.click(tabs[0]);
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
      expect(tabs[1].getAttribute("aria-selected")).toBe("false");
    });

    it("다른 탭 클릭 시 선택이 변경된다", () => {
      const { getAllByRole } = render(() => (
        <Tabs value="a">
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));
      const tabs = getAllByRole("tab");

      fireEvent.click(tabs[1]);
      expect(tabs[1].getAttribute("aria-selected")).toBe("true");
      expect(tabs[0].getAttribute("aria-selected")).toBe("false");
    });

    it("disabled 탭은 클릭해도 선택되지 않는다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <Tabs onValueChange={handleChange}>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b" disabled>
            B
          </Tabs.Tab>
        </Tabs>
      ));

      fireEvent.click(getAllByRole("tab")[1]);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("키보드 동작", () => {
    it("Space 키로 선택된다", () => {
      const { getAllByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));

      fireEvent.keyDown(getAllByRole("tab")[0], { key: " " });
      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");
    });

    it("Enter 키로 선택된다", () => {
      const { getAllByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));

      fireEvent.keyDown(getAllByRole("tab")[1], { key: "Enter" });
      expect(getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 선택 상태로 반영된다", () => {
      const { getAllByRole } = render(() => (
        <Tabs value="b">
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));

      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("false");
      expect(getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
    });

    it("onValueChange가 클릭 시 호출된다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <Tabs value="a" onValueChange={handleChange}>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));

      fireEvent.click(getAllByRole("tab")[1]);
      expect(handleChange).toHaveBeenCalledWith("b");
    });

    it("외부 상태 변경 시 업데이트된다", () => {
      const [value, setValue] = createSignal("a");
      const { getAllByRole } = render(() => (
        <Tabs value={value()} onValueChange={setValue}>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
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
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));
      const { getAllByRole: getSm } = render(() => (
        <Tabs size="sm">
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));

      expect(getDefault("tab")[0].className).not.toBe(getSm("tab")[0].className);
    });
  });

  describe("accessibility", () => {
    it("disabled 탭에 aria-disabled가 설정된다", () => {
      const { getAllByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b" disabled>
            B
          </Tabs.Tab>
        </Tabs>
      ));

      expect(getAllByRole("tab")[1].getAttribute("aria-disabled")).toBe("true");
    });

    it("disabled 탭의 tabIndex가 -1이다", () => {
      const { getAllByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b" disabled>
            B
          </Tabs.Tab>
        </Tabs>
      ));

      expect(getAllByRole("tab")[1].getAttribute("tabindex")).toBe("-1");
    });
  });

  describe("class merging", () => {
    it("Tabs에 사용자 정의 class가 병합된다", () => {
      const { getByRole } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Tabs class="my-tab-class">
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));
      expect(getByRole("tablist").classList.contains("my-tab-class")).toBe(true);
    });

    it("Tabs.Tab에 사용자 정의 class가 병합된다", () => {
      const { getByRole } = render(() => (
        <Tabs>
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <Tabs.Tab value="a" class="my-item-class">
            A
          </Tabs.Tab>
        </Tabs>
      ));
      expect(getByRole("tab").classList.contains("my-item-class")).toBe(true);
    });
  });
});
