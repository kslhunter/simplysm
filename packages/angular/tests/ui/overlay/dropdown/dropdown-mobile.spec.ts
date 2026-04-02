import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../../src/core/plugins/events/sd-resize-event.plugin";
import {
  SdDropdownTestDefault,
  SdDropdownTestDisabled,
} from "./sd-dropdown-test.fixture";
import "@simplysm/core-browser";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    ],
  });
}

function isPopupInBody(): boolean {
  return Array.from(document.body.children).some(
    (el) => el.tagName.toLowerCase() === "sd-dropdown-popup",
  );
}

function getBackdropInBody(): HTMLElement | null {
  return document.body.querySelector("[data-sd-dropdown-backdrop]");
}

describe("Feature 3.2.1 Slice 3: 드롭다운 모바일 Bottom Sheet", () => {
  let _matchMediaListener: ((e: MediaQueryListEvent) => void) | undefined;
  let matchMediaMatches = false;

  beforeEach(() => {
    _matchMediaListener = undefined;
    // matchMedia를 mock하여 모바일/데스크톱 전환 제어
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      const mql: MediaQueryList = {
        matches: matchMediaMatches,
        media: query,
        onchange: null,
        addEventListener: (_event: string, listener: any) => {
          _matchMediaListener = listener;
        },
        removeEventListener: () => {
          _matchMediaListener = undefined;
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      };
      return mql;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // cleanup: body에 남은 팝업/backdrop 제거
    document.body.querySelectorAll("sd-dropdown-popup").forEach((el) => el.remove());
    document.body.querySelectorAll("[data-sd-dropdown-backdrop]").forEach((el) => el.remove());
  });

  describe("Rule: 드롭다운이 모바일(520px 이하)에서 bottom sheet로 표시된다", () => {
    it("Unit: 닫을 때 backdrop과 data-sd-mobile이 정리된다", () => {
      matchMediaMatches = true; // 모바일

      setupTestBed(SdDropdownTestDefault);
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;

      // 열기
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(isPopupInBody()).toBe(true);
      expect(getBackdropInBody()).not.toBeNull();

      // 닫기 (클릭으로 토글)
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      // cleanup 확인
      expect(isPopupInBody()).toBe(false);
      expect(getBackdropInBody()).toBeNull();
    });

    it("Scenario: 모바일에서 드롭다운 열기 -> bottom sheet + backdrop", () => {
      matchMediaMatches = true; // 모바일

      setupTestBed(SdDropdownTestDefault);
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      // 팝업이 body에 있다
      expect(isPopupInBody()).toBe(true);

      // data-sd-mobile 속성이 설정되었다
      const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
      expect(popup.hasAttribute("data-sd-mobile")).toBe(true);

      // backdrop이 표시된다
      expect(getBackdropInBody()).not.toBeNull();
    });

    it("Scenario: 모바일에서 backdrop 탭으로 닫기", () => {
      matchMediaMatches = true; // 모바일

      setupTestBed(SdDropdownTestDefault);
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(isPopupInBody()).toBe(true);

      // backdrop 클릭
      const backdrop = getBackdropInBody();
      expect(backdrop).not.toBeNull();
      backdrop!.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      // 팝업이 닫힌다
      expect(isPopupInBody()).toBe(false);
      // backdrop도 제거된다
      expect(getBackdropInBody()).toBeNull();
    });

    it("Scenario: 데스크톱에서 기존 동작 유지", () => {
      matchMediaMatches = false; // 데스크톱

      setupTestBed(SdDropdownTestDefault);
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      // 팝업이 body에 있다
      expect(isPopupInBody()).toBe(true);

      // data-sd-mobile 속성이 없다
      const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
      expect(popup.hasAttribute("data-sd-mobile")).toBe(false);

      // backdrop이 없다
      expect(getBackdropInBody()).toBeNull();
    });

    it("열린 상태에서 viewport 변경 시 모드가 전환된다", () => {
      matchMediaMatches = false; // 데스크톱

      setupTestBed(SdDropdownTestDefault);
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      // 데스크톱: backdrop 없음
      expect(getBackdropInBody()).toBeNull();

      // viewport 변경: mobile로 전환
      _matchMediaListener?.({ matches: true } as MediaQueryListEvent);
      fixture.detectChanges();
      TestBed.flushEffects();

      // 모바일: backdrop 표시
      const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
      expect(popup.hasAttribute("data-sd-mobile")).toBe(true);
      expect(getBackdropInBody()).not.toBeNull();
    });

    it("Scenario: 모바일에서 disabled 드롭다운 -> bottom sheet 미표시", () => {
      matchMediaMatches = true; // 모바일

      setupTestBed(SdDropdownTestDisabled);
      const fixture = TestBed.createComponent(SdDropdownTestDisabled);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      // 팝업이 열리지 않는다
      expect(isPopupInBody()).toBe(false);
      // backdrop도 없다
      expect(getBackdropInBody()).toBeNull();
    });
  });
});
