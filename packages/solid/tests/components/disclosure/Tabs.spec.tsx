import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Tabs } from "../../../src/components/disclosure/Tabs";

describe("Tabs", () => {
  describe("basic rendering", () => {
    it("renders with tablist role", () => {
      const { getByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));
      expect(getByRole("tablist")).toBeTruthy();
    });

    it("renders Tabs.Tab with tab role", () => {
      const { getByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));
      expect(getByRole("tab")).toBeTruthy();
    });

    it("renders children", () => {
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

  describe("selection behavior", () => {
    it("sets aria-selected to true on click", () => {
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

    it("changes selection on different tab click", () => {
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

    it("does not select disabled tab on click", () => {
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

  describe("keyboard behavior", () => {
    it("selects tab with Space key", () => {
      const { getAllByRole } = render(() => (
        <Tabs>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));

      fireEvent.keyDown(getAllByRole("tab")[0], { key: " " });
      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");
    });

    it("selects tab with Enter key", () => {
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

  describe("controlled pattern", () => {
    it("reflects value prop as selected state", () => {
      const { getAllByRole } = render(() => (
        <Tabs value="b">
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs>
      ));

      expect(getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("false");
      expect(getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
    });

    it("calls onValueChange on click", () => {
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

    it("updates when external state changes", () => {
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

  describe("size", () => {
    it("applies different styles per size prop", () => {
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
    it("sets aria-disabled on disabled tab", () => {
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

    it("sets tabIndex to -1 on disabled tab", () => {
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
    it("merges custom class on Tabs", () => {
      const { getByRole } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Tabs class="my-tab-class">
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs>
      ));
      expect(getByRole("tablist").classList.contains("my-tab-class")).toBe(true);
    });

    it("merges custom class on Tabs.Tab", () => {
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
