import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdCrudList } from "../../../src/data/crud/sd-crud-list";
import { SdSharedDataProvider } from "../../../src/core/shared-data/sd-shared-data.provider";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import { SdActivatedModalProvider } from "../../../src/core/modal/sd-activated-modal.provider";
import { SdCrudListTestHost } from "./sd-crud-list-test.fixture";

// SdSharedDataProvider/SdToastProvider/SdActivatedModalProvider는 Angular DI 트리에서
// 외부 의존(ServiceClient, SdToastContainer, modal context)이 깊어 useValue stub 유지.
// 룰의 "함수 호출 인터셉트는 spy" 원칙이지만, 이 케이스는 의존성 자체의 대체로 정당화.
function createMockSharedDataProvider() {
  return {
    wait: vi.fn().mockResolvedValue(undefined),
    loadingCount: signal(0),
  };
}

function createMockToastProvider() {
  return {
    try: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
    info: vi.fn(),
    warning: vi.fn(),
  };
}

function createMockActivatedModal(closeFn = vi.fn()) {
  return {
    modalComponent: signal({ title: signal("테스트 모달") }),
    contentComponent: signal({
      close: { emit: closeFn },
    }),
    canDeactivateFn: () => true,
  };
}

describe("SdCrudList 내부 동작", () => {
  describe("isDeleted / getItemCellStyleFn", () => {
    let mockSharedData: ReturnType<typeof createMockSharedDataProvider>;
    let mockToast: ReturnType<typeof createMockToastProvider>;

    beforeEach(() => {
      mockSharedData = createMockSharedDataProvider();
      mockToast = createMockToastProvider();
      TestBed.configureTestingModule({
        imports: [SdCrudListTestHost],
        providers: [
          { provide: SdSharedDataProvider, useValue: mockSharedData },
          { provide: SdToastProvider, useValue: mockToast },
        ],
      });
    });

    it("currDeletedItems에 포함된 항목은 isDeleted가 true를 반환한다", () => {
      const fixture = TestBed.createComponent(SdCrudListTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "page");
      const item1 = { id: 1, name: "item1" };
      const item2 = { id: 2, name: "item2" };
      fixture.componentRef.setInput("items", [item1, item2]);
      fixture.componentRef.setInput("currDeletedItems", [item1]);
      fixture.detectChanges();

      const listComp = fixture.debugElement.children[0].componentInstance as SdCrudList<any, any>;
      expect(listComp.isDeleted(item1)).toBe(true);
      expect(listComp.isDeleted(item2)).toBe(false);
    });

    it("getItemCellStyleFn은 삭제된 항목에 line-through 스타일을 반환한다", () => {
      const fixture = TestBed.createComponent(SdCrudListTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "page");
      const item1 = { id: 1, name: "item1" };
      const item2 = { id: 2, name: "item2" };
      fixture.componentRef.setInput("items", [item1, item2]);
      fixture.componentRef.setInput("currDeletedItems", [item1]);
      fixture.detectChanges();

      const listComp = fixture.debugElement.children[0].componentInstance as SdCrudList<any, any>;
      expect(listComp.getItemCellStyleFn(item1)).toBe("text-decoration: line-through;");
      expect(listComp.getItemCellStyleFn(item2)).toBeUndefined();
    });
  });

  describe("onModalSelectionCancelClick", () => {
    it("selectedKeys를 빈 배열로 초기화한다", () => {
      const mockSharedData = createMockSharedDataProvider();
      const mockToast = createMockToastProvider();
      const mockActivatedModal = createMockActivatedModal();

      TestBed.configureTestingModule({
        imports: [SdCrudListTestHost],
        providers: [
          { provide: SdSharedDataProvider, useValue: mockSharedData },
          { provide: SdToastProvider, useValue: mockToast },
          { provide: SdActivatedModalProvider, useValue: mockActivatedModal },
        ],
      });

      const fixture = TestBed.createComponent(SdCrudListTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "modal");
      fixture.componentRef.setInput("selectMode", "multi");
      fixture.detectChanges();

      const listComp = fixture.debugElement.children[0].componentInstance as SdCrudList<any, any>;
      listComp.selectedKeys.set([1, 2, 3]);
      listComp.onModalSelectionCancelClick();

      expect(listComp.selectedKeys()).toEqual([]);
    });

    it("selectMode=single일 때 close를 빈 selectedKeys로 emit한다", () => {
      const mockSharedData = createMockSharedDataProvider();
      const mockToast = createMockToastProvider();
      const closeFn = vi.fn();
      const mockActivatedModal = createMockActivatedModal(closeFn);

      TestBed.configureTestingModule({
        imports: [SdCrudListTestHost],
        providers: [
          { provide: SdSharedDataProvider, useValue: mockSharedData },
          { provide: SdToastProvider, useValue: mockToast },
          { provide: SdActivatedModalProvider, useValue: mockActivatedModal },
        ],
      });

      const fixture = TestBed.createComponent(SdCrudListTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "modal");
      fixture.componentRef.setInput("selectMode", "single");
      fixture.detectChanges();

      const listComp = fixture.debugElement.children[0].componentInstance as SdCrudList<any, any>;
      listComp.onModalSelectionCancelClick();

      expect(closeFn).toHaveBeenCalledWith({ selectedKeys: [] });
    });
  });

  describe("onSelectedKeysChange", () => {
    it("viewType=page이면 아무 동작하지 않는다", () => {
      const mockSharedData = createMockSharedDataProvider();
      const mockToast = createMockToastProvider();

      TestBed.configureTestingModule({
        imports: [SdCrudListTestHost],
        providers: [
          { provide: SdSharedDataProvider, useValue: mockSharedData },
          { provide: SdToastProvider, useValue: mockToast },
        ],
      });

      const fixture = TestBed.createComponent(SdCrudListTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "page");
      fixture.componentRef.setInput("selectMode", "single");
      fixture.detectChanges();

      const listComp = fixture.debugElement.children[0].componentInstance as SdCrudList<any, any>;
      listComp.selectedKeys.set([1]);
      listComp.onSelectedKeysChange();
    });

    it("selectedKeys가 비어있거나 2개 이상이면 close를 emit하지 않는다", () => {
      const mockSharedData = createMockSharedDataProvider();
      const mockToast = createMockToastProvider();
      const closeFn = vi.fn();
      const mockActivatedModal = createMockActivatedModal(closeFn);

      TestBed.configureTestingModule({
        imports: [SdCrudListTestHost],
        providers: [
          { provide: SdSharedDataProvider, useValue: mockSharedData },
          { provide: SdToastProvider, useValue: mockToast },
          { provide: SdActivatedModalProvider, useValue: mockActivatedModal },
        ],
      });

      const fixture = TestBed.createComponent(SdCrudListTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "modal");
      fixture.componentRef.setInput("selectMode", "single");
      fixture.detectChanges();

      const listComp = fixture.debugElement.children[0].componentInstance as SdCrudList<any, any>;

      listComp.selectedKeys.set([]);
      listComp.onSelectedKeysChange();
      expect(closeFn).not.toHaveBeenCalled();

      listComp.selectedKeys.set([1, 2]);
      listComp.onSelectedKeysChange();
      expect(closeFn).not.toHaveBeenCalled();
    });
  });
});
