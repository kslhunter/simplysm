import { describe, it, expect, beforeEach, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import { SdLocalStorageProvider } from "../../../src/core/config/sd-local-storage.provider";
import { SdStatePresetTestHost } from "./sd-state-preset-test.fixture";
import { SdStatePreset } from "../../../src/data/state-preset/sd-state-preset";

let mockModal: { showAsync: ReturnType<typeof vi.spyOn> };

function setupTestBed() {
  TestBed.configureTestingModule({
    imports: [SdStatePresetTestHost],
  });
  const modalProvider = TestBed.inject(SdModalProvider);
  mockModal = {
    showAsync: vi.spyOn(modalProvider, "showAsync").mockResolvedValue(undefined as any),
  };
  const toastProvider = TestBed.inject(SdToastProvider);
  vi.spyOn(toastProvider, "info").mockImplementation(() => undefined);
  vi.spyOn(toastProvider, "warning").mockImplementation(() => undefined);
  const localStorage = TestBed.inject(SdLocalStorageProvider);
  vi.spyOn(localStorage, "get").mockImplementation((_key: string) => undefined);
  vi.spyOn(localStorage, "set").mockImplementation(() => {});
}

describe("Feature 2.3: sd-state-preset 스타일 복원", () => {
  beforeEach(() => {
    setupTestBed();
  });

  describe("Rule: Star 아이콘은 warning 테마 색상이어야 한다", () => {
    it("star ng-icon 요소에 tx-theme-warning-default 클래스가 있다", () => {
      const fixture = TestBed.createComponent(SdStatePresetTestHost);
      fixture.detectChanges();

      const starIcon = fixture.nativeElement.querySelector(
        "sd-state-preset sd-anchor ng-icon",
      ) as HTMLElement;
      expect(starIcon).not.toBeNull();
      expect(starIcon.classList.contains("tx-theme-warning-default")).toBe(true);
    });
  });

  describe("Rule: 프리셋 이름 앵커는 tx-trans-default 클래스를 가져야 한다", () => {
    it("프리셋이 존재할 때 이름 앵커에 tx-trans-default 클래스가 있다", async () => {
      const fixture = TestBed.createComponent(SdStatePresetTestHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const presetComp = fixture.debugElement.children[0].componentInstance as SdStatePreset;
      mockModal.showAsync.mockResolvedValueOnce("테스트");
      await presetComp.onAddClick();
      fixture.detectChanges();

      const nameAnchor = fixture.nativeElement.querySelector(
        "sd-state-preset ._preset-name",
      ) as HTMLElement;
      expect(nameAnchor).not.toBeNull();
      expect(nameAnchor.classList.contains("tx-trans-default")).toBe(true);
    });
  });

  describe("Rule: Host display는 inline-block이어야 한다", () => {
    it("호스트 요소의 display는 inline-block이고 vertical-align은 top이다", () => {
      const fixture = TestBed.createComponent(SdStatePresetTestHost);
      fixture.detectChanges();

      const hostEl = fixture.nativeElement.querySelector("sd-state-preset") as HTMLElement;
      const computed = window.getComputedStyle(hostEl);
      expect(computed.display).toBe("inline-block");
      expect(computed.verticalAlign).toBe("top");
    });
  });
});
