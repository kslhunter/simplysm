import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Pagination } from "../../../src/components/data/Pagination";

describe("Pagination component", () => {
  describe("basic rendering", () => {
    it("renders as nav element", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={5} />);

      expect(container.querySelector("nav")).toBeTruthy();
    });

    it("applies data-pagination attribute", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={5} />);

      expect(container.querySelector("[data-pagination]")).toBeTruthy();
    });

    it("renders 4 navigation buttons and page buttons", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={5} />);

      const buttons = container.querySelectorAll("[data-button]");
      // 4 navigation buttons (<<, <, >, >>) + 5 page buttons
      expect(buttons.length).toBe(9);
    });

    it("displays page numbers as 1-based", () => {
      const { getByText } = render(() => <Pagination page={1} totalPageCount={3} />);

      expect(getByText("1")).toBeTruthy();
      expect(getByText("2")).toBeTruthy();
      expect(getByText("3")).toBeTruthy();
    });

    it("passes custom class to nav element", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Pagination page={1} totalPageCount={5} class="my-custom" />
      ));

      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("my-custom");
    });
  });

  describe("displayPageCount default", () => {
    it("default displayPageCount is 10", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={25} />);

      const buttons = container.querySelectorAll("[data-button]");
      // 4 nav + 10 page buttons
      expect(buttons.length).toBe(14);
    });

    it("displays 5 page buttons when displayPageCount=5", () => {
      const { container } = render(() => (
        <Pagination page={1} totalPageCount={25} displayPageCount={5} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      // 4 nav + 5 page buttons
      expect(buttons.length).toBe(9);
    });
  });

  describe("current page display", () => {
    it("current page button has a different variant", () => {
      const { container } = render(() => <Pagination page={3} totalPageCount={5} />);

      const buttons = container.querySelectorAll("[data-button]");
      // buttons[0]=<<, [1]=<, [2]=page1, [3]=page2, [4]=page3(current), [5]=page4, [6]=page5, [7]=>, [8]=>>
      const currentButton = buttons[4]; // page 3 (1-based page=3)
      const otherButton = buttons[2]; // page 1

      expect(currentButton.className).not.toBe(otherButton.className);
    });
  });

  describe("page group calculation", () => {
    it("displays pages 1-5 when page=1, displayPageCount=5", () => {
      const { getByText, queryByText } = render(() => (
        <Pagination page={1} totalPageCount={20} displayPageCount={5} />
      ));

      expect(getByText("1")).toBeTruthy();
      expect(getByText("2")).toBeTruthy();
      expect(getByText("3")).toBeTruthy();
      expect(getByText("4")).toBeTruthy();
      expect(getByText("5")).toBeTruthy();
      expect(queryByText("6")).toBeFalsy();
    });

    it("displays pages 6-10 when page=6, displayPageCount=5", () => {
      const { getByText, queryByText } = render(() => (
        <Pagination page={6} totalPageCount={20} displayPageCount={5} />
      ));

      expect(queryByText("5")).toBeFalsy();
      expect(getByText("6")).toBeTruthy();
      expect(getByText("7")).toBeTruthy();
      expect(getByText("8")).toBeTruthy();
      expect(getByText("9")).toBeTruthy();
      expect(getByText("10")).toBeTruthy();
      expect(queryByText("11")).toBeFalsy();
    });

    it("displays pages 11-20 when page=13, displayPageCount=10", () => {
      const { getByText, queryByText } = render(() => (
        <Pagination page={13} totalPageCount={25} displayPageCount={10} />
      ));

      expect(queryByText("10")).toBeFalsy();
      expect(getByText("11")).toBeTruthy();
      expect(getByText("20")).toBeTruthy();
      expect(queryByText("21")).toBeFalsy();
    });

    it("displays only remaining pages in the last group below totalPageCount", () => {
      const { container, getByText, queryByText } = render(() => (
        <Pagination page={8} totalPageCount={8} displayPageCount={5} />
      ));

      // page=8, displayPageCount=5: from = Math.floor((8-1)/5)*5+1 = 6, pages = 6,7,8 (totalPageCount=8)
      expect(getByText("6")).toBeTruthy();
      expect(getByText("7")).toBeTruthy();
      expect(getByText("8")).toBeTruthy();
      expect(queryByText("9")).toBeFalsy();

      const buttons = container.querySelectorAll("[data-button]");
      // 4 nav + 3 page buttons
      expect(buttons.length).toBe(7);
    });
  });

  describe("navigation button disabled state", () => {
    it("disables first/prev buttons in the first group", () => {
      const { container } = render(() => (
        <Pagination page={1} totalPageCount={20} displayPageCount={5} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      const firstBtn = buttons[0]; // <<
      const prevBtn = buttons[1]; // <

      expect(firstBtn.hasAttribute("disabled")).toBe(true);
      expect(prevBtn.hasAttribute("disabled")).toBe(true);
    });

    it("disables next/last buttons in the last group", () => {
      const { container } = render(() => (
        <Pagination page={19} totalPageCount={20} displayPageCount={5} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      const nextBtn = buttons[buttons.length - 2]; // >
      const lastBtn = buttons[buttons.length - 1]; // >>

      expect(nextBtn.hasAttribute("disabled")).toBe(true);
      expect(lastBtn.hasAttribute("disabled")).toBe(true);
    });

    it("all navigation buttons are enabled in a middle group", () => {
      const { container } = render(() => (
        <Pagination page={6} totalPageCount={20} displayPageCount={5} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      const firstBtn = buttons[0];
      const prevBtn = buttons[1];
      const nextBtn = buttons[buttons.length - 2];
      const lastBtn = buttons[buttons.length - 1];

      expect(firstBtn.hasAttribute("disabled")).toBe(false);
      expect(prevBtn.hasAttribute("disabled")).toBe(false);
      expect(nextBtn.hasAttribute("disabled")).toBe(false);
      expect(lastBtn.hasAttribute("disabled")).toBe(false);
    });
  });

  describe("page click", () => {
    it("calls onPageChange when a page button is clicked", () => {
      const onPageChange = vi.fn();
      const { getByText } = render(() => (
        <Pagination page={1} totalPageCount={5} onPageChange={onPageChange} />
      ));

      fireEvent.click(getByText("3"));

      expect(onPageChange).toHaveBeenCalledWith(3); // 1-based
    });

    it("calls onPageChange even when clicking the current page", () => {
      const onPageChange = vi.fn();
      const { getByText } = render(() => (
        <Pagination page={1} totalPageCount={5} onPageChange={onPageChange} />
      ));

      fireEvent.click(getByText("1"));

      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe("first button (<<)", () => {
    it("navigates to page 1 when first button is clicked", () => {
      const onPageChange = vi.fn();
      const { container } = render(() => (
        <Pagination
          page={16}
          totalPageCount={20}
          displayPageCount={5}
          onPageChange={onPageChange}
        />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[0]); // <<

      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe("last button (>>)", () => {
    it("navigates to last page when last button is clicked", () => {
      const onPageChange = vi.fn();
      const { container } = render(() => (
        <Pagination page={1} totalPageCount={20} displayPageCount={5} onPageChange={onPageChange} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[buttons.length - 1]); // >>

      expect(onPageChange).toHaveBeenCalledWith(20); // totalPageCount
    });
  });

  describe("prev group button (<)", () => {
    it("navigates to last page of previous group when prev button is clicked", () => {
      const onPageChange = vi.fn();
      const { container } = render(() => (
        <Pagination page={8} totalPageCount={20} displayPageCount={5} onPageChange={onPageChange} />
      ));

      // page=8, displayPageCount=5: from = Math.floor((8-1)/5)*5+1 = 6
      // prev click → (pages()[0] ?? 2) - 1 = 6 - 1 = 5
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[1]); // <

      expect(onPageChange).toHaveBeenCalledWith(5);
    });
  });

  describe("next group button (>)", () => {
    it("navigates to first page of next group when next button is clicked", () => {
      const onPageChange = vi.fn();
      const { container } = render(() => (
        <Pagination page={4} totalPageCount={20} displayPageCount={5} onPageChange={onPageChange} />
      ));

      // page=4, displayPageCount=5: from=1, last in group = min(1+5-1, 20) = 5
      // next click → (pages()[pages().length - 1] ?? 0) + 1 = 5 + 1 = 6
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[buttons.length - 2]); // >

      expect(onPageChange).toHaveBeenCalledWith(6);
    });
  });

  describe("size prop", () => {
    it("applies different styles when size prop is provided", () => {
      const { container: defaultContainer } = render(() => (
        <Pagination page={1} totalPageCount={5} />
      ));
      const { container: smContainer } = render(() => (
        <Pagination page={1} totalPageCount={5} size="sm" />
      ));
      const { container: lgContainer } = render(() => (
        <Pagination page={1} totalPageCount={5} size="lg" />
      ));

      const defaultNav = defaultContainer.querySelector("nav");
      const smNav = smContainer.querySelector("nav");
      const lgNav = lgContainer.querySelector("nav");

      // sm and lg should have different classes from default
      expect(smNav?.className).not.toBe(defaultNav?.className);
      expect(lgNav?.className).not.toBe(defaultNav?.className);
    });
  });

  describe("reactive behavior", () => {
    it("updates UI when page signal changes", () => {
      const [page, setPage] = createSignal(1);

      const { container, getByText } = render(() => (
        <Pagination page={page()} totalPageCount={20} displayPageCount={5} onPageChange={setPage} />
      ));

      // initial state: pages 1-5 are displayed
      expect(getByText("1")).toBeTruthy();

      // navigate to next group (> click → page 6)
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[buttons.length - 2]); // > click → page 6

      // after page change, group 6-10 should be displayed
      expect(getByText("6")).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("all navigation buttons are disabled when totalPageCount=1", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={1} />);

      const buttons = container.querySelectorAll("[data-button]");
      const firstBtn = buttons[0];
      const prevBtn = buttons[1];
      const nextBtn = buttons[buttons.length - 2];
      const lastBtn = buttons[buttons.length - 1];

      expect(firstBtn.hasAttribute("disabled")).toBe(true);
      expect(prevBtn.hasAttribute("disabled")).toBe(true);
      expect(nextBtn.hasAttribute("disabled")).toBe(true);
      expect(lastBtn.hasAttribute("disabled")).toBe(true);
    });

    it("no page buttons displayed when totalPageCount=0", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={0} />);

      const buttons = container.querySelectorAll("[data-button]");
      // 4 nav buttons only, no page buttons
      expect(buttons.length).toBe(4);
    });
  });
});
