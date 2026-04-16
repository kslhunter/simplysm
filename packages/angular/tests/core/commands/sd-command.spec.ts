import { describe, it, expect, vi, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdCommandTestTemplate } from "./sd-command-test.fixture";
import { dispatchKeydown, createOpenModal } from "./sd-command-test.helpers";

describe("Feature 1.3 SdCommandDirective — Unit", () => {
  let cleanupModals: HTMLElement[] = [];

  afterEach(() => {
    for (const m of cleanupModals) {
      m.remove();
    }
    cleanupModals = [];
  });

  it("Ctrl+Alt+S (매칭 안 됨) 입력 시 아무 output도 emit되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    dispatchKeydown({ key: "s", ctrlKey: true, altKey: true });

    expect(fixture.componentInstance.refreshEvents.length).toBe(0);
    expect(fixture.componentInstance.saveEvents.length).toBe(0);
    expect(fixture.componentInstance.insertEvents.length).toBe(0);
  });

  it("Ctrl+Shift+S는 sdSaveCommand를 emit하지 않는다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    dispatchKeydown({ key: "s", ctrlKey: true, shiftKey: true });

    expect(fixture.componentInstance.saveEvents.length).toBe(0);
  });

  it("대문자 L(Shift 없이)로도 sdRefreshCommand가 emit된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    dispatchKeydown({ key: "L", ctrlKey: true, altKey: true });

    expect(fixture.componentInstance.refreshEvents.length).toBe(1);
  });

  it("대문자 S(Shift 없이)로도 sdSaveCommand가 emit된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    dispatchKeydown({ key: "S", ctrlKey: true });

    expect(fixture.componentInstance.saveEvents.length).toBe(1);
  });

  it("directive destroy 후 keydown 이벤트가 무시된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    fixture.destroy();

    // destroy 후 dispatchKeydown → 에러 없이 무시
    dispatchKeydown({ key: "s", ctrlKey: true });

    expect(fixture.componentInstance.saveEvents.length).toBe(0);
  });

  it("destroy 시 document keydown 리스너가 제거된다", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    fixture.destroy();

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("중첩 모달에서 최상위 모달의 커맨드만 실행된다", () => {
    // 하위 모달 (z-index 4001)
    const modalA = createOpenModal(4001);
    cleanupModals.push(modalA);

    // 상위 모달 (z-index 4002)
    const modalB = createOpenModal(4002);
    cleanupModals.push(modalB);

    const testBed = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    });

    const fixtureA = testBed.createComponent(SdCommandTestTemplate);
    modalA.appendChild(fixtureA.nativeElement);
    fixtureA.detectChanges();

    const fixtureB = testBed.createComponent(SdCommandTestTemplate);
    modalB.appendChild(fixtureB.nativeElement);
    fixtureB.detectChanges();

    dispatchKeydown({ key: "s", ctrlKey: true });

    expect(fixtureB.componentInstance.saveEvents.length).toBe(1);
    expect(fixtureA.componentInstance.saveEvents.length).toBe(0);
  });
});
