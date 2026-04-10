import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdAddressSearchModal } from "../../../src/features/address/sd-address-search.modal";
import { setupMockDaum } from "./sd-address-search-test.fixture";

describe("SdAddressSearchModal", () => {
  let mockDaumCtx: ReturnType<typeof setupMockDaum>;

  beforeEach(() => {
    mockDaumCtx = setupMockDaum();
  });

  afterEach(() => {
    mockDaumCtx.cleanup();
    document.getElementById("daum_address")?.remove();
  });

  async function createAndInit() {
    await TestBed.configureTestingModule({
      imports: [SdAddressSearchModal],
    }).compileComponents();

    const fixture = TestBed.createComponent(SdAddressSearchModal);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    await (component as any)._initAsync();
    return { fixture, component };
  }

  describe("스크립트 로딩", () => {
    it("스크립트 로드 실패 시 명확한 에러 메시지와 함께 reject한다", async () => {
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

      await TestBed.configureTestingModule({
        imports: [SdAddressSearchModal],
      }).compileComponents();

      // detectChanges 생략 — ngOnInit의 void _initAsync() unhandled rejection 방지
      const fixture = TestBed.createComponent(SdAddressSearchModal);

      await expect((fixture.componentInstance as any)._initAsync()).rejects.toThrow(
        "주소 검색 스크립트를 불러올 수 없습니다.",
      );

      appendSpy.mockRestore();
    });

    it("최초 실행 시 daum_address 스크립트를 head에 삽입한다", async () => {
      await createAndInit();

      const scriptEl = document.getElementById("daum_address");
      expect(scriptEl).toBeTruthy();
      expect(scriptEl?.tagName).toBe("SCRIPT");
      expect(scriptEl?.getAttribute("src")).toContain("postcode.v2.js");
    });

    it("이미 스크립트가 존재하면 중복 삽입하지 않는다", async () => {
      // 첫 번째 삽입
      const existingScript = document.createElement("script");
      existingScript.id = "daum_address";
      document.head.appendChild(existingScript);

      await createAndInit();

      const scripts = document.querySelectorAll("#daum_address");
      expect(scripts.length).toBe(1);
    });
  });

  describe("위젯 임베드", () => {
    it("daum.Postcode를 생성하고 embed를 호출한다", async () => {
      await createAndInit();

      expect(mockDaumCtx.embedFn).toHaveBeenCalledOnce();
      expect(mockDaumCtx.getCapturedOptions()).toBeDefined();
    });

    it("초기화 완료 후 initialized가 true가 된다", async () => {
      const { component } = await createAndInit();

      expect(component.initialized()).toBe(true);
    });

    it("onresize 콜백이 컨테이너 높이를 조정한다", async () => {
      const { fixture } = await createAndInit();

      const options = mockDaumCtx.getCapturedOptions()!;
      options.onresize({ height: 400 });

      const contentEl = fixture.nativeElement.querySelector("[style]");
      expect(contentEl?.style.height).toBe("400px");
    });
  });

  describe("주소 선택", () => {
    it("도로명 주소에서 동으로 끝나는 bname을 부가주소로 포함한다", async () => {
      const { component } = await createAndInit();
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      const options = mockDaumCtx.getCapturedOptions()!;
      options.oncomplete({
        zonecode: "06141",
        userSelectedType: "R",
        roadAddress: "서울특별시 강남구 테헤란로 427",
        jibunAddress: "서울특별시 강남구 삼성동 159",
        bname: "삼성동",
        buildingName: "",
        apartment: "N",
      });

      expect(closeSpy).toHaveBeenCalledWith({
        postNumber: "06141",
        address: "서울특별시 강남구 테헤란로 427 (삼성동)",
        buildingName: "",
      });
    });

    it("도로명 주소에서 아파트 건물명도 부가주소에 포함한다", async () => {
      const { component } = await createAndInit();
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      const options = mockDaumCtx.getCapturedOptions()!;
      options.oncomplete({
        zonecode: "06141",
        userSelectedType: "R",
        roadAddress: "서울특별시 강남구 테헤란로 427",
        jibunAddress: "",
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

    it("도로명 주소에서 bname이 동/로/가로 끝나지 않으면 부가주소를 생략한다", async () => {
      const { component } = await createAndInit();
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      const options = mockDaumCtx.getCapturedOptions()!;
      options.oncomplete({
        zonecode: "12345",
        userSelectedType: "R",
        roadAddress: "경기도 성남시 분당구 판교역로 235",
        jibunAddress: "",
        bname: "판교",
        buildingName: "",
        apartment: "N",
      });

      expect(closeSpy).toHaveBeenCalledWith({
        postNumber: "12345",
        address: "경기도 성남시 분당구 판교역로 235",
        buildingName: "",
      });
    });

    it("지번 주소 선택 시 jibunAddress를 사용한다", async () => {
      const { component } = await createAndInit();
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      const options = mockDaumCtx.getCapturedOptions()!;
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
});
