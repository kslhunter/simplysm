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
    await (component as any).initAsync();

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

  it("CDN 접근 실패 시 에러가 전파되어 무한 spinner가 발생하지 않는다", async () => {
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

    // detectChanges 생략 — ngOnInit의 void initAsync()가 unhandled rejection을 생성하므로
    const fixture = TestBed.createComponent(SdAddressSearchModal);

    // initAsync가 reject되어야 한다 (무한 대기 아님)
    await expect((fixture.componentInstance as any).initAsync()).rejects.toThrow(
      "주소 검색 스크립트를 불러올 수 없습니다.",
    );

    appendSpy.mockRestore();
  });

  it("지번 주소 선택 시 지번주소를 반환한다", async () => {
    const { component } = await createModal();

    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    await (component as any).initAsync();

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
