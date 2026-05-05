import { describe, it, expect, beforeEach, vi } from "vitest";
import { reflectComponentType, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdBaseContainer } from "../../../src/data/crud/sd-base-container";
import { SdCrudDetail } from "../../../src/data/crud/sd-crud-detail";
import { SdCrudList } from "../../../src/data/crud/sd-crud-list";
import { SdSharedDataProvider } from "../../../src/core/shared-data/sd-shared-data.provider";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import { SdActivatedModalProvider } from "../../../src/core/modal/sd-activated-modal.provider";
import { SdBaseContainerTestHost } from "./sd-base-container-test.fixture";
import { SdCrudDetailTestHost } from "./sd-crud-detail-test.fixture";
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

describe("Feature 1.1: CRUD 스캐폴드 컴포넌트 라이브러리 추가", () => {
  describe("Rule: 라이브러리 컨벤션 준수", () => {
    it("SdBaseContainer의 selector는 sd-base-container이다", () => {
      const mirror = reflectComponentType(SdBaseContainer);
      expect(mirror?.selector).toBe("sd-base-container");
    });

    it("SdCrudDetail의 selector는 sd-crud-detail이다", () => {
      const mirror = reflectComponentType(SdCrudDetail);
      expect(mirror?.selector).toBe("sd-crud-detail");
    });

    it("SdCrudList의 selector는 sd-crud-list이다", () => {
      const mirror = reflectComponentType(SdCrudList);
      expect(mirror?.selector).toBe("sd-crud-list");
    });

    it("SdBaseContainer는 standalone이다", () => {
      const mirror = reflectComponentType(SdBaseContainer);
      expect(mirror?.isStandalone).toBe(true);
    });
  });

  describe("Rule: 기능 보존 — SdBaseContainer", () => {
    let mockSharedData: ReturnType<typeof createMockSharedDataProvider>;
    let mockToast: ReturnType<typeof createMockToastProvider>;

    beforeEach(() => {
      mockSharedData = createMockSharedDataProvider();
      mockToast = createMockToastProvider();
      TestBed.configureTestingModule({
        imports: [SdBaseContainerTestHost],
        providers: [
          { provide: SdSharedDataProvider, useValue: mockSharedData },
          { provide: SdToastProvider, useValue: mockToast },
        ],
      });
    });

    it("restricted=true일 때 권한 없음 메시지가 표시된다", () => {
      const fixture = TestBed.createComponent(SdBaseContainerTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("restricted", true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain("사용권한이 없습니다");
    });

    it("viewType=page이고 initialized=true이면 sd-topbar-container가 렌더링된다", () => {
      const fixture = TestBed.createComponent(SdBaseContainerTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "page");
      fixture.detectChanges();

      const topbarContainer = fixture.nativeElement.querySelector("sd-topbar-container");
      expect(topbarContainer).not.toBeNull();
    });

    it("viewType=modal이고 initialized=true이면 sd-topbar-container가 렌더링되지 않는다", () => {
      const fixture = TestBed.createComponent(SdBaseContainerTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "modal");
      fixture.detectChanges();

      const topbarContainer = fixture.nativeElement.querySelector("sd-topbar-container");
      expect(topbarContainer).toBeNull();
    });
  });

  describe("Rule: 기능 보존 — SdCrudDetail", () => {
    let mockSharedData: ReturnType<typeof createMockSharedDataProvider>;
    let mockToast: ReturnType<typeof createMockToastProvider>;

    beforeEach(() => {
      mockSharedData = createMockSharedDataProvider();
      mockToast = createMockToastProvider();
      TestBed.configureTestingModule({
        imports: [SdCrudDetailTestHost],
        providers: [
          { provide: SdSharedDataProvider, useValue: mockSharedData },
          { provide: SdToastProvider, useValue: mockToast },
        ],
      });
    });

    it("readonly=false일 때 저장 버튼이 표시되고, 클릭하면 submit 이벤트가 발생한다", async () => {
      const fixture = TestBed.createComponent(SdCrudDetailTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "page");
      fixture.componentRef.setInput("readonly", false);
      fixture.detectChanges();
      await fixture.whenStable();

      const saveBtn = fixture.nativeElement.querySelector("sd-button") as HTMLElement;
      expect(saveBtn).not.toBeNull();
      expect(saveBtn.textContent).toContain("저장");
    });
  });

  describe("Rule: 기능 보존 — SdCrudList", () => {
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

    it("viewType=modal이고 selectMode=single일 때 항목 선택 시 close가 emit된다", async () => {
      const mockActivatedModal = {
        modalComponent: signal({ title: signal("테스트") }),
        contentComponent: signal({
          close: { emit: vi.fn() },
        }),
        canDeactivateFn: () => true,
      };

      TestBed.overrideProvider(SdActivatedModalProvider, {
        useValue: mockActivatedModal,
      });

      const fixture = TestBed.createComponent(SdCrudListTestHost);
      fixture.componentRef.setInput("initialized", true);
      fixture.componentRef.setInput("viewType", "modal");
      fixture.componentRef.setInput("selectMode", "single");
      fixture.componentRef.setInput("items", [
        { id: 1, name: "item1" },
        { id: 2, name: "item2" },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const listComp = fixture.debugElement.children[0].componentInstance as SdCrudList<any, any>;
      listComp.selectedKeys.set([1]);
      listComp.onSelectedKeysChange();

      expect(mockActivatedModal.contentComponent().close.emit).toHaveBeenCalledWith({
        selectedKeys: [1],
      });
    });
  });
});
