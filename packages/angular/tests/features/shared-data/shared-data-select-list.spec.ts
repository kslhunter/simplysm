import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/ui/overlay/modal/sd-modal.provider";
import { SDSLTestHost, listItem, type TestListItem } from "./sd-shared-data-select-list-test.fixture";
import { SdSharedDataSelectList } from "../../../src/features/shared-data/sd-shared-data-select-list";
import type { SdSelectModal } from "../../../src/ui/form/button/sd-modal-select-button";

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
    imports: [SDSLTestHost],
    providers: [{ provide: SdModalProvider, useValue: mockModal }],
  });
}

function createFixture() {
  const fixture = TestBed.createComponent(SDSLTestHost);
  const host = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, host };
}

function getCtrl(fixture: any): SdSharedDataSelectList<TestListItem, SdSelectModal<any>> {
  return fixture.debugElement.children[0].componentInstance;
}

describe("SdSharedDataSelectList", () => {
  beforeEach(() => {
    setupTestBed();
  });

  //#region Unit Tests — displayItems

  describe("displayItems", () => {
    it("__isHidden이 false인 항목만 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "A"), listItem(2, "B", { hidden: true }), listItem(3, "C")]);
      fixture.detectChanges();

      expect(getCtrl(fixture).displayItems().map((i) => i.__valueKey)).toEqual([1, 3]);
    });

    it("검색어로 __searchText를 필터링한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "Alice"), listItem(2, "Bob"), listItem(3, "Charlie")]);
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      ctrl.searchText.set("ob");
      expect(ctrl.displayItems().map((i) => i.__valueKey)).toEqual([2]);
    });

    it("검색어를 대소문자 무시로 필터링한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "Alice"), listItem(2, "BOB"), listItem(3, "charlie")]);
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      ctrl.searchText.set("bob");
      expect(ctrl.displayItems().map((i) => i.__valueKey)).toEqual([2]);
    });

    it("공백 분리 AND 검색으로 필터링한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([
        listItem(1, "서울특별시 강남구"),
        listItem(2, "서울특별시 종로구"),
        listItem(3, "부산광역시 해운대구"),
      ]);
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      ctrl.searchText.set("서울 강남");
      expect(ctrl.displayItems().map((i) => i.__valueKey)).toEqual([1]);
    });

    it("AND 조건 불일치 시 제외한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "서울특별시 강남구")]);
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      ctrl.searchText.set("서울 부산");
      expect(ctrl.displayItems().map((i) => i.__valueKey)).toEqual([]);
    });

    it("filterFn이 설정되면 추가 필터링한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "A"), listItem(2, "B"), listItem(3, "C")]);
      host.filterFn.set((_item, index) => index !== 1);
      fixture.detectChanges();

      expect(getCtrl(fixture).displayItems().map((i) => i.__valueKey)).toEqual([1, 3]);
    });

    it("pageItemCount가 설정되면 해당 페이지 항목만 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "A"), listItem(2, "B"), listItem(3, "C"), listItem(4, "D")]);
      host.pageItemCount.set(2);
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      // page 0: 첫 2개
      expect(ctrl.displayItems().map((i) => i.__valueKey)).toEqual([1, 2]);

      // page 1: 다음 2개
      ctrl.page.set(1);
      expect(ctrl.displayItems().map((i) => i.__valueKey)).toEqual([3, 4]);
    });
  });

  //#endregion

  //#region Unit Tests — pageLength

  describe("pageLength", () => {
    it("pageItemCount가 없으면 0을 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "A"), listItem(2, "B")]);
      fixture.detectChanges();

      expect(getCtrl(fixture).pageLength()).toBe(0);
    });

    it("총 페이지 수를 올림하여 반환한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([listItem(1, "A"), listItem(2, "B"), listItem(3, "C")]);
      host.pageItemCount.set(2);
      fixture.detectChanges();

      expect(getCtrl(fixture).pageLength()).toBe(2); // ceil(3/2) = 2
    });

    it("hidden 항목을 제외한 길이로 페이지 수를 계산한다", () => {
      const { fixture, host } = createFixture();
      // 5개 중 2개 hidden → 표시 3개
      host.items.set([
        listItem(1, "A"),
        listItem(2, "B", { hidden: true }),
        listItem(3, "C"),
        listItem(4, "D", { hidden: true }),
        listItem(5, "E"),
      ]);
      host.pageItemCount.set(2);
      fixture.detectChanges();

      expect(getCtrl(fixture).pageLength()).toBe(2); // ceil(3/2) = 2, not ceil(5/2) = 3
    });

    it("검색 필터 적용 후 길이로 페이지 수를 계산한다", () => {
      const { fixture, host } = createFixture();
      host.items.set([
        listItem(1, "Alice"),
        listItem(2, "Bob"),
        listItem(3, "Almond"),
        listItem(4, "Charlie"),
      ]);
      host.pageItemCount.set(2);
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      ctrl.searchText.set("Al");

      expect(ctrl.pageLength()).toBe(1); // ceil(2/2) = 1, not ceil(4/2) = 2
    });
  });

  //#endregion

  //#region Unit Tests — select / toggle

  describe("select / toggle", () => {
    it("select(item)은 selectedItem을 설정한다", () => {
      const { fixture, host } = createFixture();
      const items = [listItem(1, "A"), listItem(2, "B")];
      host.items.set(items);
      fixture.detectChanges();

      getCtrl(fixture).select(items[0]);
      expect(host.selectedItem()).toBe(items[0]);
    });

    it("toggle(item)은 선택되지 않은 항목을 선택한다", () => {
      const { fixture, host } = createFixture();
      const items = [listItem(1, "A"), listItem(2, "B")];
      host.items.set(items);
      fixture.detectChanges();

      getCtrl(fixture).toggle(items[0]);
      expect(host.selectedItem()).toBe(items[0]);
    });

    it("toggle(item)은 이미 선택된 항목을 해제한다", () => {
      const { fixture, host } = createFixture();
      const items = [listItem(1, "A")];
      host.items.set(items);
      host.selectedItem.set(items[0]);
      fixture.detectChanges();

      getCtrl(fixture).toggle(items[0]);
      expect(host.selectedItem()).toBeUndefined();
    });

    it("select(undefined)은 selectedItem을 해제한다", () => {
      const { fixture, host } = createFixture();
      const items = [listItem(1, "A")];
      host.items.set(items);
      host.selectedItem.set(items[0]);
      fixture.detectChanges();

      getCtrl(fixture).select(undefined);
      expect(host.selectedItem()).toBeUndefined();
    });
  });

  //#endregion

  //#region Unit Tests — items 변경 시 selectedItem 동기화

  describe("items 변경 시 selectedItem 동기화", () => {
    it("동일 __valueKey의 새 객체로 갱신된다", () => {
      const { fixture, host } = createFixture();
      const oldItems = [listItem(1, "Old")];
      host.items.set(oldItems);
      host.selectedItem.set(oldItems[0]);
      fixture.detectChanges();
      TestBed.flushEffects();

      const newItems = [listItem(1, "New")];
      host.items.set(newItems);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(host.selectedItem()).toBe(newItems[0]);
    });

    it("items에서 제거된 항목은 selectedItem이 undefined가 된다", () => {
      const { fixture, host } = createFixture();
      const items = [listItem(1, "A"), listItem(2, "B")];
      host.items.set(items);
      host.selectedItem.set(items[0]);
      fixture.detectChanges();
      TestBed.flushEffects();

      host.items.set([listItem(2, "B")]);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(host.selectedItem()).toBeUndefined();
    });
  });

  //#endregion

  //#region Unit Tests — 모달

  describe("onModalButtonClick", () => {
    it("모달 결과가 selectedItem에 반영된다", async () => {
      const { fixture, host } = createFixture();
      const items = [listItem(1, "A"), listItem(2, "B")];
      host.items.set(items);
      fixture.detectChanges();

      host.modal.set({ title: "Test", type: class {} as any, inputs: {} });
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      mockModal.showAsync.mockResolvedValue({ selectedItemKeys: [2], selectedItems: [] });

      await ctrl.onModalButtonClick();

      expect(host.selectedItem()).toBe(items[1]);
    });

    it("모달 취소 시 selectedItem이 변경되지 않는다", async () => {
      const { fixture, host } = createFixture();
      const items = [listItem(1, "A")];
      host.items.set(items);
      host.selectedItem.set(items[0]);
      fixture.detectChanges();

      host.modal.set({ title: "Test", type: class {} as any, inputs: {} });
      fixture.detectChanges();

      const ctrl = getCtrl(fixture);
      mockModal.showAsync.mockResolvedValue(undefined);

      await ctrl.onModalButtonClick();

      expect(host.selectedItem()).toBe(items[0]);
    });
  });

  //#endregion
});
