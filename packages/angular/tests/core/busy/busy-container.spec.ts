import { describe, it, expect, vi } from "vitest";
import { type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  SdBusyTestDefault,
  SdBusyTestMessage,
  SdBusyTestProgress,
} from "./sd-busy-test.fixture";

function setup<T>(component: Type<T>) {
  TestBed.configureTestingModule({ imports: [component] });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function getBusyContainer(fixture: any): HTMLElement {
  return fixture.nativeElement.querySelector("sd-busy-container") as HTMLElement;
}

describe("Feature 3.4 Slice 1: SdBusyContainer 렌더링", () => {
  // Acceptance: busy=true로 영역 인디케이터 표시
  it("busy=true이면 인디케이터가 표시되고 data-sd-busy 속성이 설정된다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.getAttribute("data-sd-busy")).toBe("true");
    expect(container.querySelector("._indicator")).not.toBeNull();
    expect(container.querySelector("._screen")).not.toBeNull();
  });

  // Acceptance: busy=false로 인디케이터 숨김 (CSS visibility로 제어, DOM에는 존재)
  it("busy=false이면 data-sd-busy 속성이 없고 _screen은 DOM에 존재한다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();

    fixture.componentInstance.busy.set(false);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.hasAttribute("data-sd-busy")).toBe(false);
    expect(container.querySelector("._screen")).not.toBeNull();
  });

  // Acceptance: message input으로 메시지 표시 (<pre> 래핑)
  it("busy=true이고 message가 설정되면 <pre> 태그로 래핑된 메시지가 표시된다", () => {
    const fixture = setup(SdBusyTestMessage);
    fixture.componentInstance.message.set("저장 중...");
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const messageEl = container.querySelector("._message");
    expect(messageEl).not.toBeNull();
    const preEl = messageEl!.querySelector("pre");
    expect(preEl).not.toBeNull();
    expect(preEl!.textContent).toContain("저장 중...");
  });

  // Acceptance: progressPercent input으로 진행률 바 표시 (scaleX transform 방식)
  it("busy=true이고 progressPercent가 50이면 진행률 바가 scaleX(0.5)로 표시된다", () => {
    const fixture = setup(SdBusyTestProgress);
    fixture.componentInstance.progressPercent.set(50);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const progressBar = container.querySelector("._progress-bar") as HTMLElement;
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.transform).toBe("scaleX(0.5)");
  });

  // Acceptance: spinner 타입 선택
  it("type=spinner이면 spinner 인디케이터가 표시된다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.componentInstance.type.set("spinner");
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.getAttribute("data-sd-type")).toBe("spinner");
    expect(container.querySelector("._spinner")).not.toBeNull();
  });

  // Acceptance: bar 타입 선택 (기본값)
  it("type이 지정되지 않으면 Provider 기본값인 bar 인디케이터가 표시된다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.getAttribute("data-sd-type")).toBe("bar");
    expect(container.querySelector("._bar")).not.toBeNull();
  });

  // Acceptance: cube 타입 선택 (v12 클래스: _cube1~4)
  it("type=cube이면 cube 인디케이터가 표시된다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.componentInstance.type.set("cube");
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.getAttribute("data-sd-type")).toBe("cube");
    expect(container.querySelector("._cube1")).not.toBeNull();
    expect(container.querySelector("._cube2")).not.toBeNull();
    expect(container.querySelector("._cube3")).not.toBeNull();
    expect(container.querySelector("._cube4")).not.toBeNull();
  });

  // Acceptance: busy 상태에서 키보드 입력 차단
  it("busy=true이면 keydown 이벤트가 preventDefault + stopPropagation으로 차단된다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const childEl = container.querySelector("._screen")!;
    const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    const stopSpy = vi.spyOn(event, "stopPropagation");
    childEl.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(stopSpy).toHaveBeenCalled();
  });

  // Unit: busy=false이면 keydown 이벤트가 차단되지 않는다
  it("busy=false이면 keydown 이벤트가 차단되지 않는다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(false);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    container.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  // Unit: message가 undefined이면 메시지 영역이 렌더링되지 않는다
  it("message가 undefined이면 ._message 요소가 없다", () => {
    const fixture = setup(SdBusyTestMessage);
    fixture.componentInstance.message.set(undefined);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.querySelector("._message")).toBeNull();
  });

  // Unit: progressPercent가 undefined이면 진행률 바가 없다
  it("progressPercent가 undefined이면 ._progress 요소가 없다", () => {
    const fixture = setup(SdBusyTestProgress);
    fixture.componentInstance.progressPercent.set(undefined);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.querySelector("._progress")).toBeNull();
  });
});

// region Feature 3.2: sd-busy-container v12 복원

describe("Feature 3.2 Slice 1: sd-busy-container 공통 구조 복원", () => {
  // Acceptance: _screen이 busy=false에서도 DOM에 존재
  it("busy=false일 때 _screen이 DOM에 항상 존재한다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.querySelector("._screen")).not.toBeNull();
  });

  // Acceptance: _progress가 _screen의 직접 자식
  it("progressPercent가 설정되면 _progress가 _screen의 직접 자식이다", () => {
    const fixture = setup(SdBusyTestProgress);
    fixture.componentInstance.progressPercent.set(50);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const progress = container.querySelector("._progress") as HTMLElement;
    expect(progress).not.toBeNull();
    expect(progress.parentElement!.classList.contains("_screen")).toBe(true);
  });

  // Unit: progressPercent=0이면 scaleX(0)
  it("progressPercent가 0이면 scaleX(0)으로 표시된다", () => {
    const fixture = setup(SdBusyTestProgress);
    fixture.componentInstance.progressPercent.set(0);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const progressBar = container.querySelector("._progress-bar") as HTMLElement;
    expect(progressBar.style.transform).toBe("scaleX(0)");
  });

  // Unit: progressPercent=100이면 scaleX(1)
  it("progressPercent가 100이면 scaleX(1)로 표시된다", () => {
    const fixture = setup(SdBusyTestProgress);
    fixture.componentInstance.progressPercent.set(100);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const progressBar = container.querySelector("._progress-bar") as HTMLElement;
    expect(progressBar.style.transform).toBe("scaleX(1)");
  });
});

// endregion
