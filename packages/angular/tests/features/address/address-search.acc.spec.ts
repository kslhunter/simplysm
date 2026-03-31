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
