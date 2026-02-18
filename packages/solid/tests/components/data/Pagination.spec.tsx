import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Pagination } from "../../../src/components/data/Pagination";

describe("Pagination 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("nav 요소로 렌더링된다", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={5} />);

      expect(container.querySelector("nav")).toBeTruthy();
    });

    it("data-pagination 속성이 적용된다", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={5} />);

      expect(container.querySelector("[data-pagination]")).toBeTruthy();
    });

    it("4개의 네비게이션 버튼과 페이지 버튼이 렌더링된다", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={5} />);

      const buttons = container.querySelectorAll("[data-button]");
      // 4 navigation buttons (<<, <, >, >>) + 5 page buttons
      expect(buttons.length).toBe(9);
    });

    it("페이지 번호가 1-based로 표시된다", () => {
      const { getByText } = render(() => <Pagination page={1} totalPageCount={3} />);

      expect(getByText("1")).toBeTruthy();
      expect(getByText("2")).toBeTruthy();
      expect(getByText("3")).toBeTruthy();
    });

    it("custom class가 nav 요소에 전달된다", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Pagination page={1} totalPageCount={5} class="my-custom" />
      ));

      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("my-custom");
    });
  });

  describe("displayPageCount 기본값", () => {
    it("displayPageCount 기본값은 10이다", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={25} />);

      const buttons = container.querySelectorAll("[data-button]");
      // 4 nav + 10 page buttons
      expect(buttons.length).toBe(14);
    });

    it("displayPageCount=5로 설정하면 5개의 페이지 버튼이 표시된다", () => {
      const { container } = render(() => (
        <Pagination page={1} totalPageCount={25} displayPageCount={5} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      // 4 nav + 5 page buttons
      expect(buttons.length).toBe(9);
    });
  });

  describe("현재 페이지 표시", () => {
    it("현재 페이지 버튼은 다른 variant를 가진다", () => {
      const { container } = render(() => <Pagination page={3} totalPageCount={5} />);

      const buttons = container.querySelectorAll("[data-button]");
      // buttons[0]=<<, [1]=<, [2]=page1, [3]=page2, [4]=page3(현재), [5]=page4, [6]=page5, [7]=>, [8]=>>
      const currentButton = buttons[4]; // page 3 (1-based page=3)
      const otherButton = buttons[2]; // page 1

      expect(currentButton.className).not.toBe(otherButton.className);
    });
  });

  describe("페이지 그룹 계산", () => {
    it("page=1, displayPageCount=5일 때 페이지 1~5가 표시된다", () => {
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

    it("page=6, displayPageCount=5일 때 페이지 6~10이 표시된다", () => {
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

    it("page=13, displayPageCount=10일 때 페이지 11~20이 표시된다", () => {
      const { getByText, queryByText } = render(() => (
        <Pagination page={13} totalPageCount={25} displayPageCount={10} />
      ));

      expect(queryByText("10")).toBeFalsy();
      expect(getByText("11")).toBeTruthy();
      expect(getByText("20")).toBeTruthy();
      expect(queryByText("21")).toBeFalsy();
    });

    it("마지막 그룹에서 totalPageCount보다 적은 페이지만 표시된다", () => {
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

  describe("네비게이션 버튼 비활성화", () => {
    it("첫 번째 그룹일 때 first/prev 버튼이 비활성화된다", () => {
      const { container } = render(() => (
        <Pagination page={1} totalPageCount={20} displayPageCount={5} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      const firstBtn = buttons[0]; // <<
      const prevBtn = buttons[1]; // <

      expect(firstBtn.hasAttribute("disabled")).toBe(true);
      expect(prevBtn.hasAttribute("disabled")).toBe(true);
    });

    it("마지막 그룹일 때 next/last 버튼이 비활성화된다", () => {
      const { container } = render(() => (
        <Pagination page={19} totalPageCount={20} displayPageCount={5} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      const nextBtn = buttons[buttons.length - 2]; // >
      const lastBtn = buttons[buttons.length - 1]; // >>

      expect(nextBtn.hasAttribute("disabled")).toBe(true);
      expect(lastBtn.hasAttribute("disabled")).toBe(true);
    });

    it("중간 그룹일 때 모든 네비게이션 버튼이 활성화된다", () => {
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

  describe("페이지 클릭", () => {
    it("페이지 버튼 클릭 시 onPageChange가 호출된다", () => {
      const onPageChange = vi.fn();
      const { getByText } = render(() => (
        <Pagination page={1} totalPageCount={5} onPageChange={onPageChange} />
      ));

      fireEvent.click(getByText("3"));

      expect(onPageChange).toHaveBeenCalledWith(3); // 1-based
    });

    it("현재 페이지 클릭 시에도 onPageChange가 호출된다", () => {
      const onPageChange = vi.fn();
      const { getByText } = render(() => (
        <Pagination page={1} totalPageCount={5} onPageChange={onPageChange} />
      ));

      fireEvent.click(getByText("1"));

      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe("first 버튼 (<<)", () => {
    it("first 버튼 클릭 시 page 1으로 이동한다", () => {
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

  describe("last 버튼 (>>)", () => {
    it("last 버튼 클릭 시 마지막 페이지로 이동한다", () => {
      const onPageChange = vi.fn();
      const { container } = render(() => (
        <Pagination page={1} totalPageCount={20} displayPageCount={5} onPageChange={onPageChange} />
      ));

      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[buttons.length - 1]); // >>

      expect(onPageChange).toHaveBeenCalledWith(20); // totalPageCount
    });
  });

  describe("prev 그룹 버튼 (<)", () => {
    it("prev 버튼 클릭 시 이전 그룹의 마지막 페이지로 이동한다", () => {
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

  describe("next 그룹 버튼 (>)", () => {
    it("next 버튼 클릭 시 다음 그룹의 첫 페이지로 이동한다", () => {
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
    it("size prop이 전달되면 스타일이 달라진다", () => {
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

      // sm과 lg는 default와 다른 클래스를 가져야 한다
      expect(smNav?.className).not.toBe(defaultNav?.className);
      expect(lgNav?.className).not.toBe(defaultNav?.className);
    });
  });

  describe("반응형 동작", () => {
    it("page가 시그널로 변경되면 UI가 업데이트된다", () => {
      const [page, setPage] = createSignal(1);

      const { container, getByText } = render(() => (
        <Pagination page={page()} totalPageCount={20} displayPageCount={5} onPageChange={setPage} />
      ));

      // 초기 상태: 페이지 1~5 표시
      expect(getByText("1")).toBeTruthy();

      // next 그룹으로 이동 (> 클릭 → page 6)
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[buttons.length - 2]); // > 클릭 → page 6

      // 페이지가 변경되면 6~10 그룹이 표시되어야 한다
      expect(getByText("6")).toBeTruthy();
    });
  });

  describe("엣지 케이스", () => {
    it("totalPageCount=1일 때 네비게이션 버튼이 모두 비활성화된다", () => {
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

    it("totalPageCount=0일 때 페이지 버튼이 표시되지 않는다", () => {
      const { container } = render(() => <Pagination page={1} totalPageCount={0} />);

      const buttons = container.querySelectorAll("[data-button]");
      // 4 nav buttons only, no page buttons
      expect(buttons.length).toBe(4);
    });
  });
});
