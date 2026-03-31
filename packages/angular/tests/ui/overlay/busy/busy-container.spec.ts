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

describe("Feature 3.4 Slice 1: SdBusyContainerControl 렌더링", () => {
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

  // Acceptance: busy=false로 인디케이터 숨김
  it("busy=false이면 인디케이터가 숨겨지고 data-sd-busy 속성이 없다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();

    fixture.componentInstance.busy.set(false);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.hasAttribute("data-sd-busy")).toBe(false);
    expect(container.querySelector("._indicator")).toBeNull();
  });

  // Acceptance: message input으로 메시지 표시
  it("busy=true이고 message가 설정되면 메시지가 표시된다", () => {
    const fixture = setup(SdBusyTestMessage);
    fixture.componentInstance.message.set("저장 중...");
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const messageEl = container.querySelector("._message");
    expect(messageEl).not.toBeNull();
    expect(messageEl!.textContent).toContain("저장 중...");
  });

  // Acceptance: progressPercent input으로 진행률 바 표시
  it("busy=true이고 progressPercent가 50이면 진행률 바가 50%로 표시된다", () => {
    const fixture = setup(SdBusyTestProgress);
    fixture.componentInstance.progressPercent.set(50);
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    const progressBar = container.querySelector("._progress-bar") as HTMLElement;
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe("50%");
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

  // Acceptance: cube 타입 선택
  it("type=cube이면 cube 인디케이터가 표시된다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.componentInstance.type.set("cube");
    fixture.detectChanges();
    TestBed.flushEffects();

    const container = getBusyContainer(fixture);
    expect(container.getAttribute("data-sd-type")).toBe("cube");
    expect(container.querySelector("._cube")).not.toBeNull();
    expect(container.querySelectorAll("._cube-face").length).toBe(4);
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

// region FIX-2 Slice 3: busy-container CSS 변수 배경 (CONSIST-001)

describe("FIX-2 Slice 3: busy-container 배경 CSS 변수 (CONSIST-001)", () => {
  it("busy overlay 배경이 하드코딩이 아닌 CSS 변수 기반이다", () => {
    const fixture = setup(SdBusyTestDefault);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();

    const screen = getBusyContainer(fixture).querySelector("._screen") as HTMLElement;
    expect(screen).toBeTruthy();

    // CSS 변수를 사용해야 하므로 하드코딩된 rgba(255, 255, 255, 0.6)이 아니어야 한다
    // 컴포넌트 스타일에서 var(--busy-overlay-bg)를 사용하는지 확인
    // (런타임에서 computed style은 변수가 resolve되므로 소스 코드 레벨에서 확인)
    const styles = document.querySelectorAll("style");
    let foundCssVar = false;
    for (const style of Array.from(styles)) {
      if (style.textContent.includes("--busy-overlay-bg")) {
        foundCssVar = true;
        break;
      }
    }
    expect(foundCssVar).toBe(true);
  });
});

// endregion
