import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { setupMockDaum } from "./sd-address-search-test.fixture";

describe("SdAddressSearchModal (Acceptance)", () => {
  let mockDaumCtx: ReturnType<typeof setupMockDaum>;

  beforeEach(() => {
    mockDaumCtx = setupMockDaum();
  });

  afterEach(() => {
    mockDaumCtx.cleanup();
    // 기존 script 태그 제거
    document.getElementById("daum_address")?.remove();
    TestBed.resetTestingModule();
  });

  async function createModal() {
    const { SdAddressSearchModal } = await import(
      "../../../src/features/address/sd-address-search.modal"
    );

    await TestBed.configureTestingModule({
      imports: [SdAddressSearchModal],
    }).compileComponents();

    const fixture = TestBed.createComponent(SdAddressSearchModal);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it("도로명 주소 선택 시 부가주소 포함하여 결과를 반환한다", async () => {
    const { component } = await createModal();

    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    // ngOnInit 실행
    await (component as any)._initAsync();

    const options = mockDaumCtx.getCapturedOptions()!;
    expect(options).toBeDefined();

    // 도로명 주소 선택 시뮬레이션
    options.oncomplete({
      zonecode: "06141",
      userSelectedType: "R",
      roadAddress: "서울특별시 강남구 테헤란로 427",
      jibunAddress: "서울특별시 강남구 삼성동 159",
      bname: "삼성동",
      buildingName: "위워크타워",
      apartment: "Y",
    });

    expect(closeSpy).toHaveBeenCalledWith({
      postNumber: "06141",
      address: "서울특별시 강남구 테헤란로 427 (삼성동, 위워크타워)",
      buildingName: "위워크타워",
    });
  });

  it("CDN 접근 실패 시 에러 메시지가 표시되고 무한 spinner가 발생하지 않는다", async () => {
    // script append를 가로채서 onload 대신 onerror 트리거
    const origAppendChild = document.head.appendChild.bind(document.head);
    const appendSpy = vi
      .spyOn(document.head, "appendChild")
      .mockImplementation((node: Node) => {
        if (node instanceof HTMLScriptElement && node.id === "daum_address") {
          void Promise.resolve().then(() => {
            (node as any).onerror?.(new Event("error"));
          });
          return node as any;
        }
        return origAppendChild(node);
      });

    const { SdAddressSearchModal } = await import(
      "../../../src/features/address/sd-address-search.modal"
    );
    await TestBed.configureTestingModule({
      imports: [SdAddressSearchModal],
    }).compileComponents();

    const fixture = TestBed.createComponent(SdAddressSearchModal);
    fixture.detectChanges();

    // 비동기 완료 대기
    await new Promise<void>((r) => setTimeout(r, 50));
    fixture.detectChanges();

    // 무한 spinner 대신 에러 메시지가 표시되어야 한다
    expect(fixture.componentInstance.initialized()).toBe(true);
    const errorEl = fixture.nativeElement.querySelector("._error");
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain("주소 검색 스크립트를 불러올 수 없습니다.");

    appendSpy.mockRestore();
  });

  it("CDN 접근 실패 후 재시도 시 새 스크립트가 삽입되어 정상 로드된다", async () => {
    // 첫 번째 시도: 스크립트를 DOM에 삽입하되 onerror 트리거
    let failCount = 0;
    const origAppendChild = document.head.appendChild.bind(document.head);
    const appendSpy = vi
      .spyOn(document.head, "appendChild")
      .mockImplementation((node: Node) => {
        if (node instanceof HTMLScriptElement && node.id === "daum_address") {
          // 항상 DOM에 삽입 (실제 브라우저 동작과 동일)
          origAppendChild(node);
          if (failCount === 0) {
            failCount++;
            void Promise.resolve().then(() => {
              (node as any).onerror?.(new Event("error"));
            });
            return node as any;
          }
          // 두 번째 시도: 성공
          void Promise.resolve().then(() => {
            (node as any).onload?.(new Event("load"));
          });
          return node as any;
        }
        return origAppendChild(node);
      });

    const { SdAddressSearchModal } = await import(
      "../../../src/features/address/sd-address-search.modal"
    );
    await TestBed.configureTestingModule({
      imports: [SdAddressSearchModal],
    }).compileComponents();

    // 첫 번째 모달: 실패
    const fixture1 = TestBed.createComponent(SdAddressSearchModal);
    fixture1.detectChanges();
    await new Promise<void>((r) => setTimeout(r, 50));
    fixture1.detectChanges();

    expect(fixture1.componentInstance.initialized()).toBe(true);
    expect(fixture1.componentInstance.errorMessage()).not.toBeNull();

    // 실패한 스크립트가 DOM에서 제거되었는지 확인
    expect(document.getElementById("daum_address")).toBeNull();

    fixture1.destroy();

    // 두 번째 모달: 재시도 성공
    const fixture2 = TestBed.createComponent(SdAddressSearchModal);
    fixture2.detectChanges();
    await new Promise<void>((r) => setTimeout(r, 50));
    fixture2.detectChanges();

    expect(fixture2.componentInstance.initialized()).toBe(true);
    expect(fixture2.componentInstance.errorMessage()).toBeNull();

    fixture2.destroy();
    appendSpy.mockRestore();
  });

  it("지번 ��소 선택 시 지번주소를 반환한다", async () => {
    const { component } = await createModal();

    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    await (component as any)._initAsync();

    const options = mockDaumCtx.getCapturedOptions()!;

    // 지번 주소 선택 시뮬레이션
    options.oncomplete({
      zonecode: "06141",
      userSelectedType: "J",
      roadAddress: "서울특별시 강남구 테헤란로 427",
      jibunAddress: "서울특별시 강남구 삼성동 159",
      bname: "삼성동",
      buildingName: "",
      apartment: "N",
    });

    expect(closeSpy).toHaveBeenCalledWith({
      postNumber: "06141",
      address: "서울특별시 강남구 삼성동 159",
      buildingName: "",
    });
  });
});
