import { describe, it, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdCommandTestTemplate, SdCommandTestHostDirective } from "./sd-command-test.fixture";
import { dispatchKeydown, createOpenModal } from "./sd-command-test.helpers";

describe("Feature 1.3 SdCommandDirective — Acceptance", () => {
  let cleanupModals: HTMLElement[] = [];

  afterEach(() => {
    for (const m of cleanupModals) {
      m.remove();
    }
    cleanupModals = [];
  });

  it("Ctrl+Alt+L 입력 시 sdRefreshCommand가 KeyboardEvent와 함께 emit되고 기본 동작이 차단된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    const event = dispatchKeydown({ key: "l", ctrlKey: true, altKey: true });

    expect(fixture.componentInstance.refreshEvents.length).toBe(1);
    expect(fixture.componentInstance.refreshEvents[0]).toBe(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Ctrl+S 입력 시 sdSaveCommand가 KeyboardEvent와 함께 emit되고 기본 동작이 차단된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    const event = dispatchKeydown({ key: "s", ctrlKey: true });

    expect(fixture.componentInstance.saveEvents.length).toBe(1);
    expect(fixture.componentInstance.saveEvents[0]).toBe(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Ctrl+Insert 입력 시 sdInsertCommand가 KeyboardEvent와 함께 emit되고 기본 동작이 차단된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    const event = dispatchKeydown({ key: "Insert", ctrlKey: true });

    expect(fixture.componentInstance.insertEvents.length).toBe(1);
    expect(fixture.componentInstance.insertEvents[0]).toBe(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("모달 외부 요소에서는 커맨드가 emit되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);
    fixture.detectChanges();

    const modal = createOpenModal(4001);
    cleanupModals.push(modal);

    dispatchKeydown({ key: "s", ctrlKey: true });

    expect(fixture.componentInstance.saveEvents.length).toBe(0);
  });

  it("모달 내부 요소에서는 커맨드가 정상 emit된다", () => {
    const modal = createOpenModal(4001);
    cleanupModals.push(modal);

    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestTemplate],
    }).createComponent(SdCommandTestTemplate);

    // fixture의 nativeElement를 모달 내부로 이동
    modal.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    dispatchKeydown({ key: "s", ctrlKey: true });

    expect(fixture.componentInstance.saveEvents.length).toBe(1);
  });

  it("hostDirectives로 적용된 컴포넌트에서 커맨드가 정상 동작한다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdCommandTestHostDirective],
    }).createComponent(SdCommandTestHostDirective);
    fixture.detectChanges();

    dispatchKeydown({ key: "s", ctrlKey: true });

    expect(fixture.componentInstance.saveEvents.length).toBe(1);
  });
});
