import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { IconCheck } from "@tabler/icons-solidjs";
import { List } from "../../../src/components/data/list/List";
import { ListItem } from "../../../src/components/data/list/ListItem";

describe("List 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 List 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <List>
          <ListItem>Item 1</ListItem>
        </List>
      ));

      expect(getByText("Item 1")).toBeTruthy();
    });

    it("role=tree 속성이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem>Item</ListItem>
        </List>
      ));

      expect(getByRole("tree")).toBeTruthy();
    });

    it("data-list 속성이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem>Item</ListItem>
        </List>
      ));

      expect(container.querySelector("[data-list]")).toBeTruthy();
    });
  });

  describe("inset 속성", () => {
    it("inset=true일 때 투명 배경 스타일이 적용된다", () => {
      const { container } = render(() => (
        <List inset>
          <ListItem>Item</ListItem>
        </List>
      ));

      const list = container.querySelector("[data-list]") as HTMLElement;
      expect(list.classList.contains("bg-transparent")).toBe(true);
    });

    it("inset=false일 때 기본 배경 스타일이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem>Item</ListItem>
        </List>
      ));

      const list = container.querySelector("[data-list]") as HTMLElement;
      expect(list.classList.contains("bg-gray-50")).toBe(true);
    });
  });

  describe("키보드 네비게이션", () => {
    it("ArrowDown 키로 다음 항목으로 포커스 이동", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>Item 1</ListItem>
          <ListItem>Item 2</ListItem>
          <ListItem>Item 3</ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "ArrowDown" });

      expect(document.activeElement).toBe(items[1]);
    });

    it("ArrowUp 키로 이전 항목으로 포커스 이동", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>Item 1</ListItem>
          <ListItem>Item 2</ListItem>
          <ListItem>Item 3</ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[1].focus();

      fireEvent.keyDown(items[1], { key: "ArrowUp" });

      expect(document.activeElement).toBe(items[0]);
    });

    it("Home 키로 첫 번째 항목으로 포커스 이동", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>Item 1</ListItem>
          <ListItem>Item 2</ListItem>
          <ListItem>Item 3</ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[2].focus();

      fireEvent.keyDown(items[2], { key: "Home" });

      expect(document.activeElement).toBe(items[0]);
    });

    it("End 키로 마지막 항목으로 포커스 이동", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>Item 1</ListItem>
          <ListItem>Item 2</ListItem>
          <ListItem>Item 3</ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "End" });

      expect(document.activeElement).toBe(items[2]);
    });

    it("Space 키로 항목 토글", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      // 초기 상태: 닫힘
      expect(items[0].getAttribute("aria-expanded")).toBe("false");

      fireEvent.keyDown(items[0], { key: " " });

      expect(items[0].getAttribute("aria-expanded")).toBe("true");
    });

    it("Enter 키로 항목 토글", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "Enter" });

      expect(items[0].getAttribute("aria-expanded")).toBe("true");
    });

    it("ArrowRight 키로 닫힌 항목 열기", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      expect(items[0].getAttribute("aria-expanded")).toBe("false");

      fireEvent.keyDown(items[0], { key: "ArrowRight" });

      expect(items[0].getAttribute("aria-expanded")).toBe("true");
    });

    it("ArrowRight 키로 열린 항목에서 첫 자식으로 포커스 이동", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem open>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      fireEvent.keyDown(items[0], { key: "ArrowRight" });

      expect(document.activeElement).toBe(items[1]);
    });

    it("ArrowLeft 키로 열린 항목 닫기", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem open>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[0].focus();

      expect(items[0].getAttribute("aria-expanded")).toBe("true");

      fireEvent.keyDown(items[0], { key: "ArrowLeft" });

      expect(items[0].getAttribute("aria-expanded")).toBe("false");
    });

    it("ArrowLeft 키로 닫힌 항목에서 부모로 포커스 이동", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem open>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");
      items[1].focus();

      fireEvent.keyDown(items[1], { key: "ArrowLeft" });

      expect(document.activeElement).toBe(items[0]);
    });
  });
});

describe("ListItem 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 ListItem 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <List>
          <ListItem>Test Item</ListItem>
        </List>
      ));

      expect(getByText("Test Item")).toBeTruthy();
    });

    it("role=treeitem 속성이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem>Item</ListItem>
        </List>
      ));

      expect(getByRole("treeitem")).toBeTruthy();
    });

    it("data-list-item 속성이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem>Item</ListItem>
        </List>
      ));

      expect(container.querySelector("[data-list-item]")).toBeTruthy();
    });
  });

  describe("중첩 리스트", () => {
    it("ListItem.Children이 있을 때 클릭 시 collapse 토글", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });

      expect(item.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(item);

      expect(item.getAttribute("aria-expanded")).toBe("true");

      fireEvent.click(item);

      expect(item.getAttribute("aria-expanded")).toBe("false");
    });

    it("ListItem.Children이 있을 때 chevron 아이콘이 표시된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      // chevron 아이콘 SVG가 존재하는지 확인
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    it("ListItem.Children이 없을 때 chevron 아이콘이 숨겨진다", () => {
      const { container } = render(() => (
        <List>
          <ListItem>Simple Item</ListItem>
        </List>
      ));

      const button = container.querySelector("[data-list-item]") as HTMLElement;
      // chevron이 button 내부에 없어야 함
      const svg = button.querySelector("svg");
      expect(svg).toBeFalsy();
    });

    it("aria-expanded가 없으면 ListItem.Children이 없는 것으로 간주", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem>Simple Item</ListItem>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.hasAttribute("aria-expanded")).toBe(false);
    });

    it("ListItem.Children 내부에 role=group이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem open>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      expect(getByRole("group")).toBeTruthy();
    });
  });

  describe("selected 상태", () => {
    it("selected=true일 때 배경 강조 스타일이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem selected>Selected Item</ListItem>
        </List>
      ));

      const button = container.querySelector("[data-list-item]") as HTMLElement;
      expect(button.classList.contains("bg-primary-100")).toBe(true);
    });

    it("selected=true일 때 font-bold 스타일이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem selected>Selected Item</ListItem>
        </List>
      ));

      const button = container.querySelector("[data-list-item]") as HTMLElement;
      expect(button.classList.contains("font-bold")).toBe(true);
    });

    it("aria-selected가 설정된다", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem selected>Selected Item</ListItem>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 클릭해도 아무 동작 없음", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <ListItem readonly onClick={onClick}>
            Readonly Item
          </ListItem>
        </List>
      ));

      const item = getByRole("treeitem");
      fireEvent.click(item);

      expect(onClick).not.toHaveBeenCalled();
    });

    it("readonly=true일 때 cursor-default 스타일이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem readonly>Readonly Item</ListItem>
        </List>
      ));

      const button = container.querySelector("[data-list-item]") as HTMLElement;
      expect(button.classList.contains("cursor-auto")).toBe(true);
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 opacity가 낮아진다", () => {
      const { container } = render(() => (
        <List>
          <ListItem disabled>Disabled Item</ListItem>
        </List>
      ));

      const button = container.querySelector("[data-list-item]") as HTMLElement;
      expect(button.classList.contains("opacity-50")).toBe(true);
    });

    it("disabled=true일 때 클릭 불가", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <ListItem disabled onClick={onClick}>
            Disabled Item
          </ListItem>
        </List>
      ));

      const item = getByRole("treeitem");
      fireEvent.click(item);

      expect(onClick).not.toHaveBeenCalled();
    });

    it("disabled=true일 때 tabindex=-1이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem disabled>Disabled Item</ListItem>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.getAttribute("tabindex")).toBe("-1");
    });

    it("aria-disabled가 설정된다", () => {
      const { getByRole } = render(() => (
        <List>
          <ListItem disabled>Disabled Item</ListItem>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("selectedIcon", () => {
    it("selectedIcon이 제공되고 ListItem.Children이 없을 때 아이콘이 표시된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem selectedIcon={IconCheck}>Item</ListItem>
        </List>
      ));

      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    it("selectedIcon이 제공되고 selected=true일 때 primary 색상이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem selectedIcon={IconCheck} selected>
            Item
          </ListItem>
        </List>
      ));

      const svg = container.querySelector("svg");
      expect(svg?.classList.contains("text-primary-600")).toBe(true);
    });

    it("selectedIcon이 제공되고 selected=false일 때 투명한 색상이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <ListItem selectedIcon={IconCheck}>Item</ListItem>
        </List>
      ));

      const svg = container.querySelector("svg");
      expect(svg?.classList.contains("text-black/30")).toBe(true);
    });

    it("selectedIcon이 제공되고 ListItem.Children이 있을 때 아이콘이 숨겨진다", () => {
      const { container } = render(() => (
        <List>
          <ListItem selectedIcon={IconCheck}>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      // 첫 번째 ListItem의 button 내 아이콘은 selectedIcon이 아닌 chevron이어야 함
      const button = container.querySelector("[data-list-item]") as HTMLElement;
      const svgs = button.querySelectorAll("svg");

      // chevron만 있어야 함 (selectedIcon은 숨겨짐)
      expect(svgs.length).toBe(1);
    });
  });

  describe("onClick", () => {
    it("ListItem.Children이 없고 onClick이 제공될 때 클릭 시 호출된다", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <ListItem onClick={onClick}>Clickable Item</ListItem>
        </List>
      ));

      const item = getByRole("treeitem");
      fireEvent.click(item);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("ListItem.Children이 있을 때는 onClick 대신 collapse 토글이 발생한다", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <ListItem onClick={onClick}>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });
      fireEvent.click(item);

      expect(onClick).not.toHaveBeenCalled();
      expect(item.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("controlled 모드", () => {
    it("open과 onOpenChange가 제공되면 controlled 모드로 동작", () => {
      const onOpenChange = vi.fn();

      const { getByRole } = render(() => (
        <List>
          <ListItem open={false} onOpenChange={onOpenChange}>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });
      fireEvent.click(item);

      expect(onOpenChange).toHaveBeenCalledWith(true);
      // controlled 모드이므로 실제 상태는 변경되지 않음
      expect(item.getAttribute("aria-expanded")).toBe("false");
    });

    it("open prop 변경 시 상태가 반영된다", () => {
      const [open, setOpen] = createSignal(false);

      const { getByRole } = render(() => (
        <List>
          <ListItem open={open()} onOpenChange={setOpen}>
            Folder
            <ListItem.Children>
              <ListItem>File</ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const item = getByRole("treeitem", { name: /Folder/i });

      expect(item.getAttribute("aria-expanded")).toBe("false");

      // 클릭 시 onOpenChange 호출 -> setOpen(true)
      fireEvent.click(item);

      expect(item.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("aria-level", () => {
    it("aria-level이 중첩 수준에 따라 설정된다", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem open>
            Level 1
            <ListItem.Children>
              <ListItem open>
                Level 2
                <ListItem.Children>
                  <ListItem>Level 3</ListItem>
                </ListItem.Children>
              </ListItem>
            </ListItem.Children>
          </ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");

      expect(items[0].getAttribute("aria-level")).toBe("1");
      expect(items[1].getAttribute("aria-level")).toBe("2");
      expect(items[2].getAttribute("aria-level")).toBe("3");
    });
  });

  describe("Roving tabindex", () => {
    it("포커스 시 현재 항목만 tabindex=0이 된다", () => {
      const { getAllByRole } = render(() => (
        <List>
          <ListItem>Item 1</ListItem>
          <ListItem>Item 2</ListItem>
          <ListItem>Item 3</ListItem>
        </List>
      ));

      const items = getAllByRole("treeitem");

      // 초기 상태: 모든 항목이 tabindex=0
      items.forEach((item) => {
        expect(item.getAttribute("tabindex")).toBe("0");
      });

      // 두 번째 항목 포커스
      fireEvent.focus(items[1]);

      // 포커스된 항목만 tabindex=0, 나머지는 -1
      expect(items[0].getAttribute("tabindex")).toBe("-1");
      expect(items[1].getAttribute("tabindex")).toBe("0");
      expect(items[2].getAttribute("tabindex")).toBe("-1");
    });
  });
});
