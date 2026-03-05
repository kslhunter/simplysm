import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { IconCheck } from "@tabler/icons-solidjs";
import { List } from "../../../src/components/data/list/List";

describe("List component", () => {
  describe("keyboard navigation", () => {
    it("ArrowDown moves focus to next item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>Item 1</List.Item>
          <List.Item>Item 2</List.Item>
          <List.Item>Item 3</List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "ArrowDown" });

      expect(document.activeElement).toBe(items[1]);
    });

    it("ArrowUp moves focus to previous item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>Item 1</List.Item>
          <List.Item>Item 2</List.Item>
          <List.Item>Item 3</List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[1].focus();

      fireEvent.keyDown(items[1], { key: "ArrowUp" });

      expect(document.activeElement).toBe(items[0]);
    });

    it("Home moves focus to first item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>Item 1</List.Item>
          <List.Item>Item 2</List.Item>
          <List.Item>Item 3</List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[2].focus();

      fireEvent.keyDown(items[2], { key: "Home" });

      expect(document.activeElement).toBe(items[0]);
    });

    it("End moves focus to last item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>Item 1</List.Item>
          <List.Item>Item 2</List.Item>
          <List.Item>Item 3</List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "End" });

      expect(document.activeElement).toBe(items[2]);
    });

    it("Space toggles item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      expect(items[0].getAttribute("aria-expanded")).toBe("false");

      fireEvent.keyDown(items[0], { key: " " });

      expect(items[0].getAttribute("aria-expanded")).toBe("true");
    });

    it("Enter toggles item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "Enter" });

      expect(items[0].getAttribute("aria-expanded")).toBe("true");
    });

    it("ArrowRight opens a closed item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      expect(items[0].getAttribute("aria-expanded")).toBe("false");

      fireEvent.keyDown(items[0], { key: "ArrowRight" });

      expect(items[0].getAttribute("aria-expanded")).toBe("true");
    });

    it("ArrowRight moves focus to first child when item is open", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item open>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "ArrowRight" });

      expect(document.activeElement).toBe(items[1]);
    });

    it("ArrowLeft closes an open item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item open>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      expect(items[0].getAttribute("aria-expanded")).toBe("true");

      fireEvent.keyDown(items[0], { key: "ArrowLeft" });

      expect(items[0].getAttribute("aria-expanded")).toBe("false");
    });

    it("ArrowLeft moves focus to parent from a closed item", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item open>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[1].focus();

      fireEvent.keyDown(items[1], { key: "ArrowLeft" });

      expect(document.activeElement).toBe(items[0]);
    });
  });
});

describe("List.Item component", () => {
  describe("nested list", () => {
    it("toggles collapse on click when List.Item.Children is present", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });

      expect(item.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(item);

      expect(item.getAttribute("aria-expanded")).toBe("true");

      fireEvent.click(item);

      expect(item.getAttribute("aria-expanded")).toBe("false");
    });

  });

  describe("readonly state", () => {
    it("does not call onClick when readonly=true", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <List.Item readOnly onClick={onClick}>
            Readonly Item
          </List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      fireEvent.click(item);

      expect(onClick).not.toHaveBeenCalled();
    });

  });

  describe("disabled state", () => {
    it("not clickable when disabled=true", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <List.Item disabled onClick={onClick}>
            Disabled Item
          </List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      fireEvent.click(item);

      expect(onClick).not.toHaveBeenCalled();
    });

  });

  describe("selectedIcon", () => {
    it("hides selectedIcon when List.Item.Children is present", () => {
      const { container } = render(() => (
        <List>
          <List.Item selectedIcon={IconCheck}>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const button = container.querySelector("[data-list-item]") as HTMLElement;
      const svgs = button.querySelectorAll("svg");

      // only chevron should be present (selectedIcon is hidden)
      expect(svgs.length).toBe(1);
    });
  });

  describe("onClick", () => {
    it("calls onClick on click when no List.Item.Children", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <List.Item onClick={onClick}>Clickable Item</List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      fireEvent.click(item);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("toggles collapse instead of onClick when List.Item.Children is present", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <List.Item onClick={onClick}>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });
      fireEvent.click(item);

      expect(onClick).not.toHaveBeenCalled();
      expect(item.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("controlled mode", () => {
    it("operates in controlled mode when open and onOpenChange are provided", () => {
      const onOpenChange = vi.fn();

      const { getByRole } = render(() => (
        <List>
          <List.Item open={false} onOpenChange={onOpenChange}>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });
      fireEvent.click(item);

      expect(onOpenChange).toHaveBeenCalledWith(true);
      // controlled mode: actual state does not change
      expect(item.getAttribute("aria-expanded")).toBe("false");
    });

    it("reflects state change when open prop changes", () => {
      const [open, setOpen] = createSignal(false);

      const { getByRole } = render(() => (
        <List>
          <List.Item open={open()} onOpenChange={setOpen}>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });

      expect(item.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(item);

      expect(item.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("aria-level", () => {
    it("sets aria-level based on nesting depth", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item open>
            Level 1
            <List.Item.Children>
              <List.Item open>
                Level 2
                <List.Item.Children>
                  <List.Item>Level 3</List.Item>
                </List.Item.Children>
              </List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");

      expect(items[0].getAttribute("aria-level")).toBe("1");
      expect(items[1].getAttribute("aria-level")).toBe("2");
      expect(items[2].getAttribute("aria-level")).toBe("3");
    });
  });

  describe("Roving tabindex", () => {
    it("only focused item gets tabindex=0", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>Item 1</List.Item>
          <List.Item>Item 2</List.Item>
          <List.Item>Item 3</List.Item>
        </List>
      ));

      const items = getAllByRole("treeitem");

      // initial state: all items have tabindex=0
      items.forEach((item) => {
        expect(item.getAttribute("tabindex")).toBe("0");
      });

      // focus second item
      fireEvent.focus(items[1]);

      // only focused item has tabindex=0, others are -1
      expect(items[0].getAttribute("tabindex")).toBe("-1");
      expect(items[1].getAttribute("tabindex")).toBe("0");
      expect(items[2].getAttribute("tabindex")).toBe("-1");
    });
  });
});
