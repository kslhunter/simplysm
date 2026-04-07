import { describe, it, expect, vi } from "vitest";
import { type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  SdModalTestControlDefault,
  SdModalTestNoBackdrop,
  SdModalTestNoEsc,
  SdModalTestHideCloseButton,
  SdModalTestHideHeader,
  SdModalTestMovable,
} from "./sd-modal-test.fixture";
import { SdActivatedModalProvider } from "../../../../src/core/providers/sd-activated-modal.provider";

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

function getBackdrop(modal: HTMLElement): HTMLElement | null {
  return modal.querySelector("._backdrop");
}

function getDialog(modal: HTMLElement): HTMLElement | null {
  return modal.querySelector("._dialog");
}

function getHeader(modal: HTMLElement): HTMLElement | null {
  return modal.querySelector("._header");
}

function getCloseButton(modal: HTMLElement): HTMLElement | null {
  return modal.querySelector("._close-btn");
}

function pressKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("Feature 3.2 Slice 2: SdModalControl 렌더링 + 닫기", () => {
  // Acceptance: 배경 클릭 닫기 활성화
  it("useCloseByBackdrop=true (기본값)이면 배경 클릭 시 closeRequest가 발생한다", () => {
    const fixture = setup(SdModalTestControlDefault);
    const modal = getModal(fixture);
    const backdrop = getBackdrop(modal);

    expect(backdrop).not.toBeNull();
    backdrop!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(true);
  });

  // Acceptance: 배경 클릭 닫기 비활성화
  it("useCloseByBackdrop=false이면 배경 클릭해도 closeRequest가 발생하지 않는다", () => {
    const fixture = setup(SdModalTestNoBackdrop);
    const modal = getModal(fixture);
    const backdrop = getBackdrop(modal);

    expect(backdrop).not.toBeNull();
    backdrop!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(false);
  });

  // Acceptance: ESC 키 닫기 활성화
  it("useCloseByEscapeKey=true (기본값)이면 ESC 키로 closeRequest가 발생한다", () => {
    const fixture = setup(SdModalTestControlDefault);
    const modal = getModal(fixture);
    const dialog = getDialog(modal);

    expect(dialog).not.toBeNull();
    pressKey(dialog!, "Escape");
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(true);
  });

  // Acceptance: ESC 키 닫기 비활성화
  it("useCloseByEscapeKey=false이면 ESC 키를 눌러도 closeRequest가 발생하지 않는다", () => {
    const fixture = setup(SdModalTestNoEsc);
    const modal = getModal(fixture);
    const dialog = getDialog(modal);

    expect(dialog).not.toBeNull();
    pressKey(dialog!, "Escape");
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(false);
  });

  // Acceptance: 닫기 버튼 클릭
  it("닫기 버튼 클릭 시 closeRequest가 발생한다", () => {
    const fixture = setup(SdModalTestControlDefault);
    const modal = getModal(fixture);
    const closeBtn = getCloseButton(modal);

    expect(closeBtn).not.toBeNull();
    closeBtn!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(true);
  });

  // Acceptance: 닫기 버튼 숨김
  it("hideCloseButton=true이면 닫기 버튼이 표시되지 않는다", () => {
    const fixture = setup(SdModalTestHideCloseButton);
    const modal = getModal(fixture);
    const closeBtn = getCloseButton(modal);

    expect(closeBtn).toBeNull();
  });

  // Acceptance: 헤더 숨김
  it("hideHeader=true이면 헤더가 표시되지 않는다", () => {
    const fixture = setup(SdModalTestHideHeader);
    const modal = getModal(fixture);
    const header = getHeader(modal);

    expect(header).toBeNull();
  });

  // Acceptance: canDeactiveFn이 닫기 차단
  it("canDeactiveFn()이 false이면 배경 클릭, ESC, 닫기 버튼 모두 닫기가 차단된다", () => {
    const activatedModal = new SdActivatedModalProvider();
    activatedModal.canDeactiveFn = () => false;

    TestBed.configureTestingModule({
      imports: [SdModalTestControlDefault],
      providers: [{ provide: SdActivatedModalProvider, useValue: activatedModal }],
    });
    const fixture = TestBed.createComponent(SdModalTestControlDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const modal = getModal(fixture);

    // 배경 클릭
    getBackdrop(modal)!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.closed).toBe(false);

    // ESC 키
    pressKey(getDialog(modal)!, "Escape");
    fixture.detectChanges();
    expect(fixture.componentInstance.closed).toBe(false);

    // 닫기 버튼
    getCloseButton(modal)!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.closed).toBe(false);
  });

  // Unit: canDeactiveFn()이 true이면 닫기가 허용된다
  it("canDeactiveFn()이 true이면 닫기 버튼으로 닫기가 허용된다", () => {
    const activatedModal = new SdActivatedModalProvider();
    activatedModal.canDeactiveFn = () => true;

    TestBed.configureTestingModule({
      imports: [SdModalTestControlDefault],
      providers: [{ provide: SdActivatedModalProvider, useValue: activatedModal }],
    });
    const fixture = TestBed.createComponent(SdModalTestControlDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const modal = getModal(fixture);
    getCloseButton(modal)!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(true);
  });

  // Unit: SdActivatedModalProvider가 없어도(optional inject) 닫기가 작동한다
  it("SdActivatedModalProvider가 없어도 닫기가 정상 작동한다", () => {
    const fixture = setup(SdModalTestControlDefault);
    const modal = getModal(fixture);

    getCloseButton(modal)!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(true);
  });
});

// region Feature 3.2 Slice 2: 모달 좌표 및 z-index

describe("Feature 3.2 Slice 2: 모달 drag/resize 좌표 + z-index", () => {
  // Acceptance: drag 초기 위치가 getBoundingClientRect 기반이다
  it("drag 시작 시 getBoundingClientRect 기반 초기 위치를 사용한다", () => {
    const fixture = setup(SdModalTestMovable);
    const modal = getModal(fixture);
    const dialog = getDialog(modal)!;
    const header = getHeader(modal)!;

    // dialog.offsetLeft는 jsdom에서 0이지만, getBoundingClientRect는 mock 가능
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      top: 200, left: 150, bottom: 400, right: 550, width: 400, height: 200,
      x: 150, y: 200, toJSON: () => ({}),
    });
    // offsetParent mock
    Object.defineProperty(dialog, "offsetParent", { value: modal, configurable: true });
    vi.spyOn(modal, "getBoundingClientRect").mockReturnValue({
      top: 0, left: 0, bottom: 768, right: 1024, width: 1024, height: 768,
      x: 0, y: 0, toJSON: () => ({}),
    });

    // drag: (200, 100) → (300, 150)
    header.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 200, clientY: 100, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 300, clientY: 150, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    fixture.detectChanges();

    // startLeft=150 (rect.left - parentRect.left), dx=100 → 250
    // startTop=200 (rect.top - parentRect.top), dy=50 → 250
    expect(dialog.style.left).toBe("250px");
    expect(dialog.style.top).toBe("250px");
  });

  // Acceptance: zIndex 미설정 모달에 focus 시 기본값 할당
  it("zIndex 미설정 모달에 focus하면 4001이 할당된다", () => {
    const fixture = setup(SdModalTestControlDefault);
    const modal = getModal(fixture);
    const dialog = getDialog(modal)!;

    // zIndex 미설정 상태
    expect(modal.style.zIndex).toBe("");

    // focus 이벤트 발생
    dialog.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // NaN이 아닌 유효한 zIndex가 설정되어야 한다
    const z = parseInt(modal.style.zIndex, 10);
    expect(Number.isNaN(z)).toBe(false);
    expect(z).toBe(4001);
  });

  // Unit: zIndex가 이미 최대이면 값이 변경되지 않는다 (early-return)
  it("zIndex가 이미 최대이면 값이 변경되지 않는다", () => {
    const fixture = setup(SdModalTestControlDefault);
    const modal = getModal(fixture);
    const dialog = getDialog(modal)!;

    // 이미 최대 z-index 설정
    modal.style.zIndex = "9999";

    dialog.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // early-return으로 zIndex가 변경되지 않아야 한다
    expect(modal.style.zIndex).toBe("9999");
  });
});

// endregion

// region data-sd-init

describe("data-sd-init 마이그레이션 포팅", () => {
  // Acceptance: effect 실행 후 data-sd-init 속성이 설정된다
  it("컴포넌트 렌더 후 effect가 실행되면 data-sd-init 속성이 존재한다", () => {
    const fixture = setup(SdModalTestControlDefault);
    const modal = getModal(fixture);

    expect(modal.hasAttribute("data-sd-init")).toBe(true);
  });

  // Unit: 초기 렌더(detectChanges 전)에는 data-sd-init이 없다
  it("flushEffects 전에는 data-sd-init이 없다", () => {
    TestBed.configureTestingModule({ imports: [SdModalTestControlDefault] });
    const fixture = TestBed.createComponent(SdModalTestControlDefault);
    // detectChanges/flushEffects 하지 않음
    const modal = fixture.nativeElement.querySelector("sd-modal") as HTMLElement;

    expect(modal.hasAttribute("data-sd-init")).toBe(false);
  });
});

// endregion
