import { describe, it, expect } from "vitest";
import { type Type } from "@angular/core";
import { By } from "@angular/platform-browser";
import { TestBed } from "@angular/core/testing";
import {
  SdModalTestControlDefault,
  SdModalTestNoBackdrop,
  SdModalTestHideCloseButton,
} from "./sd-modal-test.fixture";
import { SdModal } from "../../../src/core/modal/sd-modal";

function setup<T>(component: Type<T>) {
  TestBed.configureTestingModule({ imports: [component] });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function getModal(fixture: any): HTMLElement {
  return fixture.nativeElement.querySelector("sd-modal") as HTMLElement;
}

describe("Feature 3.3 Slice 1: 템플릿/HTML 복원", () => {
  describe("Rule: 제목 태그는 h5", () => {
    it("._title 요소는 <h5> 태그이다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const title = modal.querySelector("._title");

      expect(title).not.toBeNull();
      expect(title!.tagName.toLowerCase()).toBe("h5");
    });
  });

  describe("Rule: 닫기 버튼은 sd-anchor 컴포넌트", () => {
    it("닫기 버튼은 <sd-anchor> 컴포넌트이고 theme='gray'이다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const closeBtn = modal.querySelector("._close-btn");

      expect(closeBtn).not.toBeNull();
      expect(closeBtn!.tagName.toLowerCase()).toBe("sd-anchor");
      expect(closeBtn!.getAttribute("data-sd-theme")).toBe("gray");
    });

    it("sd-anchor 내부에 ng-icon이 있다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const closeBtn = modal.querySelector("._close-btn");
      const icon = closeBtn?.querySelector("ng-icon");

      expect(icon).not.toBeNull();
    });

    it("hideCloseButton=true이면 sd-anchor 닫기 버튼이 없다", () => {
      const fixture = setup(SdModalTestHideCloseButton);
      const modal = getModal(fixture);
      const closeBtn = modal.querySelector("sd-anchor._close-btn");

      expect(closeBtn).toBeNull();
    });
  });

  describe("Rule: backdrop 이벤트는 click", () => {
    it("backdrop click으로 closeRequest가 발생한다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const backdrop = modal.querySelector("._backdrop")!;

      backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.closed).toBe(true);
    });

    it("backdrop mousedown만으로는 closeRequest가 발생하지 않는다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const backdrop = modal.querySelector("._backdrop")!;

      backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.closed).toBe(false);
    });

    it("useCloseByBackdrop=false이면 backdrop click에도 닫히지 않는다", () => {
      const fixture = setup(SdModalTestNoBackdrop);
      const modal = getModal(fixture);
      const backdrop = modal.querySelector("._backdrop")!;

      backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.closed).toBe(false);
    });
  });

  describe("Rule: dialog tabindex는 -1 (포커스 트랩 호환)", () => {
    // D4: tabindex="-1" 유지. 포커스 트랩 도입과 함께 변경된 의도적 개선.
    it("._dialog 요소의 tabindex는 '-1'이다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const dialog = modal.querySelector("._dialog");

      expect(dialog).not.toBeNull();
      expect(dialog!.getAttribute("tabindex")).toBe("-1");
    });
  });
});

function getSdModalInstance(fixture: any): SdModal {
  return fixture.debugElement.query(By.directive(SdModal)).componentInstance as SdModal;
}

describe("Feature 3.3 Slice 2: sdResize 자동 크기 조정 + window:resize", () => {
  describe("Rule: 자동 maxHeight/maxWidth 조정", () => {
    it("dialog 높이가 호스트를 초과하면 maxHeight=100%, height=100%가 적용된다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const dialog = modal.querySelector("._dialog") as HTMLElement;
      const sdModal = getSdModalInstance(fixture);

      // mock: dialog가 host보다 큼
      Object.defineProperty(dialog, "offsetHeight", { value: 800, configurable: true });
      Object.defineProperty(modal, "offsetHeight", { value: 600, configurable: true });

      sdModal.onHostResize({ heightChanged: true, widthChanged: false, target: modal, contentRect: new DOMRect() });

      expect(dialog.style.maxHeight).toBe("100%");
      expect(dialog.style.height).toBe("100%");
    });

    it("dialog 너비가 호스트를 초과하면 maxWidth=100%, width=100%가 적용된다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const dialog = modal.querySelector("._dialog") as HTMLElement;
      const sdModal = getSdModalInstance(fixture);

      // mock: dialog가 host보다 큼
      Object.defineProperty(dialog, "offsetWidth", { value: 1200, configurable: true });
      Object.defineProperty(modal, "offsetWidth", { value: 1024, configurable: true });

      sdModal.onHostResize({ heightChanged: false, widthChanged: true, target: modal, contentRect: new DOMRect() });

      expect(dialog.style.maxWidth).toBe("100%");
      expect(dialog.style.width).toBe("100%");
    });

    it("dialog 크기가 호스트 내에 있으면 maxHeight/maxWidth가 적용되지 않는다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const dialog = modal.querySelector("._dialog") as HTMLElement;
      const sdModal = getSdModalInstance(fixture);

      // mock: dialog가 host보다 작음
      Object.defineProperty(dialog, "offsetHeight", { value: 300, configurable: true });
      Object.defineProperty(dialog, "offsetWidth", { value: 400, configurable: true });
      Object.defineProperty(modal, "offsetHeight", { value: 600, configurable: true });
      Object.defineProperty(modal, "offsetWidth", { value: 1024, configurable: true });

      sdModal.onHostResize({ heightChanged: true, widthChanged: true, target: modal, contentRect: new DOMRect() });

      expect(dialog.style.maxHeight).toBe("");
      expect(dialog.style.maxWidth).toBe("");
    });
  });

  describe("Rule: 윈도우 리사이즈 시 dialog 위치 보정", () => {
    it("dialog가 뷰포트 오른쪽 밖이면 left가 보정된다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const dialog = modal.querySelector("._dialog") as HTMLElement;
      const sdModal = getSdModalInstance(fixture);

      // dialog가 호스트 오른쪽 밖
      Object.defineProperty(dialog, "offsetLeft", { value: 1000, configurable: true });
      Object.defineProperty(modal, "offsetWidth", { value: 800, configurable: true });

      sdModal.onWindowResize();

      expect(dialog.style.left).toBe("700px"); // 800 - 100
    });

    it("dialog가 뷰포트 아래로 넘치면 top이 보정된다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const dialog = modal.querySelector("._dialog") as HTMLElement;
      const sdModal = getSdModalInstance(fixture);

      // dialog가 호스트 아래쪽 밖
      Object.defineProperty(dialog, "offsetTop", { value: 700, configurable: true });
      Object.defineProperty(modal, "offsetHeight", { value: 600, configurable: true });

      sdModal.onWindowResize();

      expect(dialog.style.top).toBe("500px"); // 600 - 100
    });

    it("dialog가 뷰포트 내에 있으면 위치가 변경되지 않는다", () => {
      const fixture = setup(SdModalTestControlDefault);
      const modal = getModal(fixture);
      const dialog = modal.querySelector("._dialog") as HTMLElement;
      const sdModal = getSdModalInstance(fixture);

      // dialog가 호스트 내
      Object.defineProperty(dialog, "offsetLeft", { value: 100, configurable: true });
      Object.defineProperty(dialog, "offsetTop", { value: 100, configurable: true });
      Object.defineProperty(modal, "offsetWidth", { value: 800, configurable: true });
      Object.defineProperty(modal, "offsetHeight", { value: 600, configurable: true });

      sdModal.onWindowResize();

      expect(dialog.style.left).toBe("");
      expect(dialog.style.top).toBe("");
    });
  });
});
