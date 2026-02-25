import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { IconCheck } from "@tabler/icons-solidjs";
import { List } from "../../../src/components/data/list/List";

describe("List 컴포넌트", () => {
  describe("basic rendering", () => {
    it("children이 List 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <List>
          <List.Item>Item 1</List.Item>
        </List>
      ));

      expect(getByText("Item 1")).toBeTruthy();
    });

    it("role=tree 속성이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));

      expect(getByRole("tree")).toBeTruthy();
    });

    it("data-list 속성이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));

      expect(container.querySelector("[data-list]")).toBeTruthy();
    });
  });

  describe("inset 속성", () => {
    it("inset prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));
      const { container: insetContainer } = render(() => (
        <List inset>
          <List.Item>Item</List.Item>
        </List>
      ));

      const defaultClass = (defaultContainer.querySelector("[data-list]") as HTMLElement).className;
      const insetClass = (insetContainer.querySelector("[data-list]") as HTMLElement).className;

      expect(defaultClass).not.toBe(insetClass);
    });
  });

  describe("키보드 네비게이션", () => {
    it("ArrowDown 키로 다음 항목으로 포커스 이동", () => {
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

    it("ArrowUp 키로 이전 항목으로 포커스 이동", () => {
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

    it("Home 키로 첫 번째 항목으로 포커스 이동", () => {
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

    it("End 키로 마지막 항목으로 포커스 이동", () => {
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

    it("Space 키로 항목 토글", () => {
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

    it("Enter 키로 항목 토글", () => {
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

    it("ArrowRight 키로 닫힌 항목 열기", () => {
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

    it("ArrowRight 키로 열린 항목에서 첫 자식으로 포커스 이동", () => {
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

    it("ArrowLeft 키로 열린 항목 닫기", () => {
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

    it("ArrowLeft 키로 닫힌 항목에서 부모로 포커스 이동", () => {
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

describe("List.Item 컴포넌트", () => {
  describe("basic rendering", () => {
    it("children이 List.Item 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <List>
          <List.Item>Test Item</List.Item>
        </List>
      ));

      expect(getByText("Test Item")).toBeTruthy();
    });

    it("role=treeitem 속성이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));

      expect(getByRole("treeitem")).toBeTruthy();
    });

    it("data-list-item 속성이 적용된다", () => {
      const { container } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));

      expect(container.querySelector("[data-list-item]")).toBeTruthy();
    });
  });

  describe("중첩 리스트", () => {
    it("List.Item.Children이 있을 때 클릭 시 collapse 토글", () => {
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

    it("List.Item.Children이 있을 때 chevron 아이콘이 표시된다", () => {
      const { container } = render(() => (
        <List>
          <List.Item>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    it("List.Item.Children이 없을 때 chevron 아이콘이 숨겨진다", () => {
      const { container } = render(() => (
        <List>
          <List.Item>Simple Item</List.Item>
        </List>
      ));

      const button = container.querySelector("[data-list-item]") as HTMLElement;
      const svg = button.querySelector("svg");
      expect(svg).toBeFalsy();
    });

    it("aria-expanded가 없으면 List.Item.Children이 없는 것으로 간주", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item>Simple Item</List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.hasAttribute("aria-expanded")).toBe(false);
    });

    it("List.Item.Children 내부에 role=group이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item open>
            Folder
            <List.Item.Children>
              <List.Item>File</List.Item>
            </List.Item.Children>
          </List.Item>
        </List>
      ));

      expect(getByRole("group")).toBeTruthy();
    });
  });

  describe("selected 상태", () => {
    it("selected prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));
      const { container: selectedContainer } = render(() => (
        <List>
          <List.Item selected>Item</List.Item>
        </List>
      ));

      const defaultClass = (defaultContainer.querySelector("[data-list-item]") as HTMLElement)
        .className;
      const selectedClass = (selectedContainer.querySelector("[data-list-item]") as HTMLElement)
        .className;

      expect(defaultClass).not.toBe(selectedClass);
    });

    it("aria-selected가 설정된다", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item selected>Selected Item</List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 클릭해도 onClick이 호출되지 않음", () => {
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <List>
          <List.Item readonly onClick={onClick}>
            Readonly Item
          </List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      fireEvent.click(item);

      expect(onClick).not.toHaveBeenCalled();
    });

    it("readonly prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));
      const { container: readonlyContainer } = render(() => (
        <List>
          <List.Item readonly>Item</List.Item>
        </List>
      ));

      const defaultClass = (defaultContainer.querySelector("[data-list-item]") as HTMLElement)
        .className;
      const readonlyClass = (readonlyContainer.querySelector("[data-list-item]") as HTMLElement)
        .className;

      expect(defaultClass).not.toBe(readonlyClass);
    });
  });

  describe("disabled state", () => {
    it("disabled prop에 따라 스타일이 달라진다", () => {
      const { container: defaultContainer } = render(() => (
        <List>
          <List.Item>Item</List.Item>
        </List>
      ));
      const { container: disabledContainer } = render(() => (
        <List>
          <List.Item disabled>Item</List.Item>
        </List>
      ));

      const defaultClass = (defaultContainer.querySelector("[data-list-item]") as HTMLElement)
        .className;
      const disabledClass = (disabledContainer.querySelector("[data-list-item]") as HTMLElement)
        .className;

      expect(defaultClass).not.toBe(disabledClass);
    });

    it("disabled=true일 때 클릭 불가", () => {
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

    it("disabled=true일 때 tabindex=-1이 적용된다", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item disabled>Disabled Item</List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.getAttribute("tabindex")).toBe("-1");
    });

    it("aria-disabled가 설정된다", () => {
      const { getByRole } = render(() => (
        <List>
          <List.Item disabled>Disabled Item</List.Item>
        </List>
      ));

      const item = getByRole("treeitem");
      expect(item.getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("selectedIcon", () => {
    it("selectedIcon이 제공되고 List.Item.Children이 없을 때 아이콘이 표시된다", () => {
      const { container } = render(() => (
        <List>
          <List.Item selectedIcon={IconCheck}>Item</List.Item>
        </List>
      ));

      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    it("selectedIcon과 selected 상태에 따라 아이콘 스타일이 달라진다", () => {
      const { container: unselectedContainer } = render(() => (
        <List>
          <List.Item selectedIcon={IconCheck}>Item</List.Item>
        </List>
      ));
      const { container: selectedContainer } = render(() => (
        <List>
          <List.Item selectedIcon={IconCheck} selected>
            Item
          </List.Item>
        </List>
      ));

      const unselectedSvg = unselectedContainer.querySelector("svg");
      const selectedSvg = selectedContainer.querySelector("svg");

      expect(unselectedSvg?.className).not.toBe(selectedSvg?.className);
    });

    it("selectedIcon이 제공되고 List.Item.Children이 있을 때 아이콘이 숨겨진다", () => {
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

      // chevron만 있어야 함 (selectedIcon은 숨겨짐)
      expect(svgs.length).toBe(1);
    });
  });

  describe("onClick", () => {
    it("List.Item.Children이 없고 onClick이 제공될 때 클릭 시 호출된다", () => {
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

    it("List.Item.Children이 있을 때는 onClick 대신 collapse 토글이 발생한다", () => {
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

  describe("controlled 모드", () => {
    it("open과 onOpenChange가 제공되면 controlled 모드로 동작", () => {
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
      // controlled 모드이므로 실제 상태는 변경되지 않음
      expect(item.getAttribute("aria-expanded")).toBe("false");
    });

    it("open prop 변경 시 상태가 반영된다", () => {
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
    it("aria-level이 중첩 수준에 따라 설정된다", () => {
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
    it("포커스 시 현재 항목만 tabindex=0이 된다", () => {
      const { getAllByRole } = render(() => (
        <List>
          <List.Item>Item 1</List.Item>
          <List.Item>Item 2</List.Item>
          <List.Item>Item 3</List.Item>
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
