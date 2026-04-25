import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSelectionManager } from "../../../src/core/selection/useSelectionManager";

interface Item {
  id: number;
  tenant?: string;
  name: string;
}

function createKeyManager<TKey = number>(
  items: Item[],
  mode: "single" | "multi" | undefined,
  trackByFn: (item: Item, index: number) => TKey = ((item: Item) => item.id) as any,
) {
  TestBed.configureTestingModule({});
  const displayItems = signal(items);
  const selectedKeys = signal<NonNullable<TKey>[]>([]);
  const selectMode = signal<"single" | "multi" | undefined>(mode);
  const selectableFn = signal<((item: Item) => boolean | string) | undefined>(undefined);
  const trackBy = signal<(item: Item, index: number) => TKey>(trackByFn);

  const manager = useSelectionManager({
    displayItems,
    selectedKeys,
    selectMode,
    getItemSelectableFn: selectableFn,
    trackByFn: trackBy,
  });

  return { manager, selectedKeys, displayItems };
}

describe("Feature 1.1: 선택 관리 핵심 모듈 key 기반 전환", () => {
  describe("Rule: select는 item의 key를 계산하여 selectedKeys에 추가한다", () => {
    it("single 모드에서 select 시 이전 선택 key가 교체된다", () => {
      const A: Item = { id: 1, name: "A" };
      const B: Item = { id: 2, name: "B" };
      const { manager, selectedKeys } = createKeyManager([A, B], "single");

      manager.select(A);
      expect(selectedKeys()).toEqual([1]);

      manager.select(B);
      expect(selectedKeys()).toEqual([2]);
    });

    it("multi 모드에서 select 시 기존 key에 추가된다", () => {
      const A: Item = { id: 1, name: "A" };
      const B: Item = { id: 2, name: "B" };
      const { manager, selectedKeys } = createKeyManager([A, B], "multi");

      manager.select(A);
      manager.select(B);
      expect(selectedKeys()).toEqual([1, 2]);
    });

    it("이미 선택된 아이템을 다시 select하면 중복되지 않는다", () => {
      const A: Item = { id: 1, name: "A" };
      const { manager, selectedKeys } = createKeyManager([A], "multi");

      manager.select(A);
      manager.select(A);
      expect(selectedKeys()).toEqual([1]);
    });
  });

  describe("Rule: deselect는 item의 key를 계산하여 selectedKeys에서 제거한다", () => {
    it("선택된 아이템을 deselect하면 key가 제거된다", () => {
      const A: Item = { id: 1, name: "A" };
      const { manager, selectedKeys } = createKeyManager([A], "multi");

      manager.select(A);
      expect(selectedKeys()).toEqual([1]);

      manager.deselect(A);
      expect(selectedKeys()).toEqual([]);
    });

    it("같은 key의 다른 reference를 deselect하면 제거된다", () => {
      const A1: Item = { id: 1, name: "A" };
      const A2: Item = { id: 1, name: "A-copy" };
      const { manager, selectedKeys } = createKeyManager([A1, A2], "multi");

      manager.select(A1);
      expect(selectedKeys()).toEqual([1]);

      manager.deselect(A2);
      expect(selectedKeys()).toEqual([]);
    });
  });

  describe("Rule: toggle은 key 기반으로 선택/해제를 토글한다", () => {
    it("미선택 아이템을 toggle하면 key가 추가된다", () => {
      const A: Item = { id: 1, name: "A" };
      const { manager, selectedKeys } = createKeyManager([A], "multi");

      manager.toggle(A);
      expect(selectedKeys()).toEqual([1]);
    });

    it("선택된 아이템을 toggle하면 key가 제거된다", () => {
      const A: Item = { id: 1, name: "A" };
      const { manager, selectedKeys } = createKeyManager([A], "multi");

      manager.toggle(A);
      expect(selectedKeys()).toEqual([1]);

      manager.toggle(A);
      expect(selectedKeys()).toEqual([]);
    });
  });

  describe("Rule: toggleAll은 selectedKeys 배열을 직접 조작한다", () => {
    it("전체 미선택 상태에서 toggleAll → 모든 selectable key 추가", () => {
      const A: Item = { id: 1, name: "A" };
      const B: Item = { id: 2, name: "B" };
      const { manager, selectedKeys } = createKeyManager([A, B], "multi");

      manager.toggleAll();
      expect(selectedKeys()).toEqual([1, 2]);
    });

    it("전체 선택 상태에서 toggleAll → 현재 displayItems의 key만 제거", () => {
      const A: Item = { id: 1, name: "A" };
      const B: Item = { id: 2, name: "B" };
      const { manager, selectedKeys, displayItems } = createKeyManager([A], "multi");

      manager.select(A);
      displayItems.set([B]);
      manager.select(B);
      expect(selectedKeys()).toEqual([1, 2]);

      manager.toggleAll();
      expect(selectedKeys()).toEqual([1]);
    });
  });

  describe("Rule: isSelected는 key 비교로 판정한다", () => {
    it("같은 key의 다른 reference도 isSelected=true", () => {
      const A1: Item = { id: 1, name: "A" };
      const { manager, displayItems } = createKeyManager([A1], "multi");

      manager.select(A1);

      const A2: Item = { id: 1, name: "A-updated" };
      displayItems.set([A2]);

      expect(manager.isSelected(A2)).toBe(true);
    });
  });

  describe("Rule: 복합 key도 obj.equal deep 비교로 매칭된다", () => {
    it("복합 object key가 deep equal로 비교된다", () => {
      const A1: Item = { id: 1, tenant: "a", name: "A" };
      const { manager, displayItems } = createKeyManager(
        [A1],
        "multi",
        (item) => ({ id: item.id, tenant: item.tenant }),
      );

      manager.select(A1);

      const A2: Item = { id: 1, tenant: "a", name: "A-updated" };
      displayItems.set([A2]);

      expect(manager.isSelected(A2)).toBe(true);
    });
  });
});
