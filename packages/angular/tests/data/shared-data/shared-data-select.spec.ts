import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import {
  SharedDataSelectTestHost,
  item,
  type TestSharedItem,
} from "./sd-shared-data-select-test.fixture";
import { SdSharedDataSelect } from "../../../src/data/shared-data/sd-shared-data-select";
import type { SdSelectModal } from "../../../src/controls/button/sd-modal-select-button";

function createMockModalProvider() {
  return {
    showAsync: vi.fn().mockResolvedValue(undefined),
    modalCount: signal(0),
  };
}

let mockModal: ReturnType<typeof createMockModalProvider>;

function setupTestBed() {
  mockModal = createMockModalProvider();
  TestBed.configureTestingModule({
    imports: [SharedDataSelectTestHost],
    providers: [{ provide: SdModalProvider, useValue: mockModal }],
  });
}

function createFixture() {
  const fixture = TestBed.createComponent(SharedDataSelectTestHost);
  const host = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, host };
}

describe("SdSharedDataSelect", () => {
  beforeEach(() => {
    setupTestBed();
  });

  //#region Unit Tests — 드롭다운 닫힘 시 searchText 초기화

  describe("드롭다운 닫힘 시 searchText 초기화", () => {
    it("초기 실행 시 searchText를 변경하지 않는다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A")]);
      fixture.detectChanges();
      TestBed.flushEffects();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      // 초기 상태에서 searchText는 undefined (변경 없음)
      expect(ctrl.searchText()).toBeUndefined();
    });

    it("드롭다운이 열릴 때 searchText를 변경하지 않는다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A")]);
      fixture.detectChanges();
      TestBed.flushEffects();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      ctrl.searchText.set("test");

      // 드롭다운 열기
      const selectCtrl = (ctrl as any)._selectCtrl();
      if (selectCtrl != null) {
        selectCtrl.dropdownOpen.set(true);
        fixture.detectChanges();
        TestBed.flushEffects();
      }

      // 검색어가 유지되어야 한다
      expect(ctrl.searchText()).toBe("test");
    });

    it("드롭다운이 닫힐 때 searchText를 초기화한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A")]);
      fixture.detectChanges();
      TestBed.flushEffects();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;

      // 드롭다운 열기
      const selectCtrl = (ctrl as any)._selectCtrl();
      if (selectCtrl != null) {
        selectCtrl.dropdownOpen.set(true);
        fixture.detectChanges();
        TestBed.flushEffects();
      }

      ctrl.searchText.set("test");

      // 드롭다운 닫기
      if (selectCtrl != null) {
        selectCtrl.dropdownOpen.set(false);
        fixture.detectChanges();
        TestBed.flushEffects();
      }

      // 검색어가 초기화되어야 한다
      expect(ctrl.searchText()).toBeUndefined();
    });
  });

  //#endregion

  //#region Unit Tests — rootDisplayItems

  describe("rootDisplayItems", () => {
    it("items를 그대로 반환한다 (필터 없음, 트리 아님)", () => {
      const { fixture, host } = createFixture();
      const items = [item(1, "A"), item(2, "B"), item(3, "C")];
      host.items.set(items);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.rootDisplayItems()).toEqual(items);
    });

    it("filterFn이 설정되면 조건에 맞는 항목만 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A"), item(2, "B"), item(3, "C")]);
      host.filterFn.set((_item, index) => index !== 1);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.rootDisplayItems().map((i) => i.__valueKey)).toEqual([1, 3]);
    });

    it("트리 구조에서 루트 항목만 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([
        item(1, "Parent"),
        item(2, "Child", { parentKey: 1 }),
      ]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.rootDisplayItems().map((i) => i.__valueKey)).toEqual([1]);
    });

    it("displayOrderKeyProp이 설정되면 해당 속성으로 정렬한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([
        item(1, "C", { order: 3 }),
        item(2, "A", { order: 1 }),
        item(3, "B", { order: 2 }),
      ]);
      host.displayOrderKeyProp.set("order");
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.rootDisplayItems().map((i) => i.__valueKey)).toEqual([2, 3, 1]);
    });
  });

  //#endregion

  //#region Unit Tests — selectedKeys

  describe("selectedKeys", () => {
    it("single mode에서 value가 설정되면 단일 키 배열을 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A")]);
      host.value.set(1);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.selectedKeys()).toEqual([1]);
    });

    it("multi mode에서 value가 배열이면 해당 배열을 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A"), item(2, "B")]);
      host.selectMode.set("multi");
      host.value.set([1, 2]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.selectedKeys()).toEqual([1, 2]);
    });

    it("value가 undefined이면 빈 배열을 반환한다", () => {
      const { fixture } = createFixture();
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.selectedKeys()).toEqual([]);
    });
  });

  //#endregion

  //#region Unit Tests — isIncludeSearchText

  describe("isIncludeSearchText", () => {
    it("검색어가 없으면 true를 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "Alice")]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.isIncludeSearchText(item(1, "Alice"), 0)).toBe(true);
    });

    it("검색어가 포함되면 true를 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "Alice")]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      ctrl.searchText.set("ali");
      expect(ctrl.isIncludeSearchText(item(1, "Alice"), 0)).toBe(true);
    });

    it("공백 분리 AND 검색: 모든 단어가 포함되어야 true", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "Alice Bob")]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      ctrl.searchText.set("alice bob");
      expect(ctrl.isIncludeSearchText(item(1, "Alice Bob"), 0)).toBe(true);

      ctrl.searchText.set("alice charlie");
      expect(ctrl.isIncludeSearchText(item(1, "Alice Bob"), 0)).toBe(false);
    });

    it("트리에서 자식이 매칭되면 부모도 true를 반환한다", () => {
      const { fixture, host } = createFixture();
      const parent = item(1, "Group");
      const child = item(2, "Target Item", { parentKey: 1 });
      host.items.set([parent, child]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      ctrl.searchText.set("target");
      expect(ctrl.isIncludeSearchText(parent, 0)).toBe(true);
    });
  });

  //#endregion

  //#region Unit Tests — getItemVisible

  describe("getItemVisible", () => {
    it("검색어에 매칭되고 숨김이 아닌 항목은 true", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A")]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getItemVisible(item(1, "A"), 0)).toBe(true);
    });

    it("숨김 항목은 false", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A", { hidden: true })]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getItemVisible(item(1, "A", { hidden: true }), 0)).toBe(false);
    });

    it("숨김이지만 현재 선택된 항목은 true", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A", { hidden: true })]);
      host.value.set(1);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getItemVisible(item(1, "A", { hidden: true }), 0)).toBe(true);
    });
  });

  //#endregion

  //#region Unit Tests — getItemSelectable

  describe("getItemSelectable", () => {
    it("플랫 목록에서는 항상 true", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A")]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getItemSelectable(item(1, "A"), 0, 0)).toBe(true);
    });

    it("트리에서 depth 0이고 parentKey가 없는 항목(카테고리)은 true", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "Parent"), item(2, "Child", { parentKey: 1 })]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getItemSelectable(item(1, "Parent"), 0, 0)).toBe(true);
    });

    it("트리에서 depth > 0인 자식은 true", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "Parent"), item(2, "Child", { parentKey: 1 })]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getItemSelectable(item(2, "Child", { parentKey: 1 }), 0, 1)).toBe(true);
    });
  });

  //#endregion

  //#region Unit Tests — getChildren

  describe("getChildren", () => {
    it("트리에서 자식 항목을 반환한다", () => {
      const { fixture, host } = createFixture();
      const parent = item(1, "Parent");
      const child1 = item(2, "Child1", { parentKey: 1 });
      const child2 = item(3, "Child2", { parentKey: 1 });
      host.items.set([parent, child1, child2]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getChildren(parent)).toEqual([child1, child2]);
    });

    it("자식이 없으면 빈 배열을 반환한다", () => {
      const { fixture, host } = createFixture();
      const leaf = item(1, "Leaf");
      host.items.set([leaf, item(2, "Other")]);
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      expect(ctrl.getChildren(leaf)).toEqual([]);
    });
  });

  //#endregion

  //#region Unit Tests — modal

  describe("onModalButtonClick", () => {
    it("모달 결과가 value에 반영된다 (single)", async () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A"), item(2, "B")]);
      host.modal.set({ title: "Test", type: class {} as any, inputs: {} });
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      mockModal.showAsync.mockResolvedValue({ selectedItemKeys: [2], selectedItems: [] });

      const event = new MouseEvent("click");
      vi.spyOn(event, "preventDefault");
      vi.spyOn(event, "stopPropagation");
      await ctrl.onModalButtonClick(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(host.value()).toBe(2);
    });

    it("모달 취소 시 value가 변경되지 않는다", async () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A")]);
      host.value.set(1);
      host.modal.set({ title: "Test", type: class {} as any, inputs: {} });
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      mockModal.showAsync.mockResolvedValue(undefined);

      await ctrl.onModalButtonClick(new MouseEvent("click"));

      expect(host.value()).toBe(1);
    });

    it("모달 결과가 value에 반영된다 (multi)", async () => {
      const { fixture, host } = createFixture();
      host.selectMode.set("multi");
      host.items.set([item(1, "A"), item(2, "B"), item(3, "C")]);
      host.modal.set({ title: "Test", type: class {} as any, inputs: {} });
      fixture.detectChanges();

      const ctrl = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      mockModal.showAsync.mockResolvedValue({ selectedItemKeys: [1, 3], selectedItems: [] });

      await ctrl.onModalButtonClick(new MouseEvent("click"));

      expect(host.value()).toEqual([1, 3]);
    });
  });

  //#endregion

  //#region Acceptance Test — trackByFn 전달

  describe("sd-shared-data-select가 sd-select에 trackByFn을 전달한다", () => {
    it("내부 sd-select의 trackByFn이 __valueKey 기반으로 설정된다", () => {
      const { fixture, host } = createFixture();
      host.items.set([item(1, "A"), item(2, "B")]);
      fixture.detectChanges();

      const sharedDataSelect = fixture.debugElement.children[0].componentInstance as SdSharedDataSelect<TestSharedItem, any, SdSelectModal<any>>;
      const selectCtrl = (sharedDataSelect as any)._selectCtrl();

      // sd-select에 trackByFn input이 전달되었는지 확인
      expect(selectCtrl.trackByFn()).toBeDefined();

      // trackByFn이 __valueKey를 반환하는지 확인
      const testItem = item(42, "Test");
      expect(selectCtrl.trackByFn()(testItem, 0)).toBe(42);
    });
  });

  //#endregion
});
