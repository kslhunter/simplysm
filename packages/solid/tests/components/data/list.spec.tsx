import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { IconCheck } from "@tabler/icons-solidjs";
import { List } from "../../../src/components/data/list";
import { ListItem } from "../../../src/components/data/list-item";

describe("List", () => {
  describe("렌더링", () => {
    it("여러 항목이 렌더링된다", () => {
      render(() => (
        <List>
          <ListItem>항목 1</ListItem>
          <ListItem>항목 2</ListItem>
          <ListItem>항목 3</ListItem>
        </List>
      ));

      expect(screen.getByText("항목 1")).toBeInTheDocument();
      expect(screen.getByText("항목 2")).toBeInTheDocument();
      expect(screen.getByText("항목 3")).toBeInTheDocument();
    });

    it("role=tree 속성이 적용된다", () => {
      render(() => (
        <List>
          <ListItem>항목</ListItem>
        </List>
      ));

      expect(screen.getByRole("tree")).toBeInTheDocument();
    });
  });

  describe("키보드 네비게이션", () => {
    it("ArrowDown 키로 다음 항목으로 포커스 이동한다", () => {
      render(() => (
        <List>
          <ListItem>항목 1</ListItem>
          <ListItem>항목 2</ListItem>
        </List>
      ));

      const item1 = screen.getByText("항목 1").closest("[data-list-item]") as HTMLElement;
      const item2 = screen.getByText("항목 2").closest("[data-list-item]") as HTMLElement;

      item1.focus();
      fireEvent.keyDown(item1, { key: "ArrowDown" });

      expect(document.activeElement).toBe(item2);
    });

    it("ArrowUp 키로 이전 항목으로 포커스 이동한다", () => {
      render(() => (
        <List>
          <ListItem>항목 1</ListItem>
          <ListItem>항목 2</ListItem>
        </List>
      ));

      const item1 = screen.getByText("항목 1").closest("[data-list-item]") as HTMLElement;
      const item2 = screen.getByText("항목 2").closest("[data-list-item]") as HTMLElement;

      item2.focus();
      fireEvent.keyDown(item2, { key: "ArrowUp" });

      expect(document.activeElement).toBe(item1);
    });

    it("Home 키로 첫 번째 항목으로 포커스 이동한다", () => {
      render(() => (
        <List>
          <ListItem>항목 1</ListItem>
          <ListItem>항목 2</ListItem>
          <ListItem>항목 3</ListItem>
        </List>
      ));

      const item1 = screen.getByText("항목 1").closest("[data-list-item]") as HTMLElement;
      const item3 = screen.getByText("항목 3").closest("[data-list-item]") as HTMLElement;

      item3.focus();
      fireEvent.keyDown(item3, { key: "Home" });

      expect(document.activeElement).toBe(item1);
    });

    it("End 키로 마지막 항목으로 포커스 이동한다", () => {
      render(() => (
        <List>
          <ListItem>항목 1</ListItem>
          <ListItem>항목 2</ListItem>
          <ListItem>항목 3</ListItem>
        </List>
      ));

      const item1 = screen.getByText("항목 1").closest("[data-list-item]") as HTMLElement;
      const item3 = screen.getByText("항목 3").closest("[data-list-item]") as HTMLElement;

      item1.focus();
      fireEvent.keyDown(item1, { key: "End" });

      expect(document.activeElement).toBe(item3);
    });

    it("Space 키로 항목을 클릭한다", () => {
      const handleClick = vi.fn();

      render(() => (
        <List>
          <ListItem onClick={handleClick}>항목 1</ListItem>
        </List>
      ));

      const item = screen.getByText("항목 1").closest("[data-list-item]") as HTMLElement;
      item.focus();
      fireEvent.keyDown(item, { key: " " });

      expect(handleClick).toHaveBeenCalled();
    });
  });
});

describe("ListItem", () => {
  // NOTE: icon prop은 ListItemProps에 정의되어 있지만 현재 렌더링 구현이 없음
  // 향후 구현 시 테스트 추가 필요

  describe("selectedIcon prop", () => {
    it("selectedIcon이 렌더링된다", () => {
      render(() => (
        <List>
          <ListItem selectedIcon={IconCheck} selected>체크된 항목</ListItem>
        </List>
      ));

      // IconCheck의 tabler-icon 클래스를 가진 SVG가 렌더링되어야 함
      const svg = document.querySelector("svg.tabler-icon");
      expect(svg).toBeInTheDocument();
    });

    it("선택되지 않은 상태에서도 selectedIcon 공간이 확보된다", () => {
      render(() => (
        <List>
          <ListItem selectedIcon={IconCheck}>미선택 항목</ListItem>
        </List>
      ));

      // selectedIcon이 있으면 아이콘이 렌더링됨 (선택 여부와 관계없이)
      const svg = document.querySelector("svg.tabler-icon");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("controlled 모드 (open/onOpenChange)", () => {
    it("open prop으로 중첩 리스트의 열림 상태를 제어할 수 있다", () => {
      render(() => (
        <List>
          <ListItem open={true}>
            부모 항목
            <List>
              <ListItem>자식 항목</ListItem>
            </List>
          </ListItem>
        </List>
      ));

      // open=true이므로 자식 항목이 보여야 함
      expect(screen.getByText("자식 항목")).toBeInTheDocument();
    });

    it("open=false일 때 중첩 리스트가 닫힌다", () => {
      render(() => (
        <List>
          <ListItem open={false}>
            부모 항목
            <List>
              <ListItem>자식 항목</ListItem>
            </List>
          </ListItem>
        </List>
      ));

      // Collapse 컴포넌트가 height: 0px로 렌더링됨
      const collapse = document.querySelector("[data-collapsed]");
      expect(collapse).toBeInTheDocument();
    });

    it("onOpenChange가 호출된다", () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <List>
          <ListItem open={false} onOpenChange={handleOpenChange}>
            부모 항목
            <List>
              <ListItem>자식 항목</ListItem>
            </List>
          </ListItem>
        </List>
      ));

      const parentItem = screen.getByText("부모 항목").closest("[data-list-item]") as HTMLElement;
      fireEvent.click(parentItem);

      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("중첩 리스트 아코디언 동작", () => {
    it("중첩 리스트가 있으면 아코디언 버튼이 표시된다", () => {
      render(() => (
        <List>
          <ListItem>
            부모 항목
            <List>
              <ListItem>자식 항목</ListItem>
            </List>
          </ListItem>
        </List>
      ));

      // aria-expanded 속성이 있어야 함
      const item = screen.getByText("부모 항목").closest("[data-list-item]") as HTMLElement;
      expect(item).toHaveAttribute("aria-expanded");
    });

    it("클릭으로 중첩 리스트를 토글한다", () => {
      const [open, setOpen] = createSignal(false);

      render(() => (
        <List>
          <ListItem open={open()} onOpenChange={setOpen}>
            부모 항목
            <List>
              <ListItem>자식 항목</ListItem>
            </List>
          </ListItem>
        </List>
      ));

      const parentItem = screen.getByText("부모 항목").closest("[data-list-item]") as HTMLElement;

      // 초기 상태: 닫힘
      expect(parentItem).toHaveAttribute("aria-expanded", "false");

      // 클릭으로 열기
      fireEvent.click(parentItem);
      expect(open()).toBe(true);
    });

    it("layout=flat일 때 중첩 리스트가 항상 펼쳐진다", () => {
      render(() => (
        <List>
          <ListItem layout="flat">
            부모 항목
            <List>
              <ListItem>자식 항목</ListItem>
            </List>
          </ListItem>
        </List>
      ));

      // flat 레이아웃에서는 자식 항목이 항상 보임
      expect(screen.getByText("자식 항목")).toBeInTheDocument();
    });
  });
});
