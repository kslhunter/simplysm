import { describe, it, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdBusyProvider } from "../../../src/core/busy/sd-busy.provider";
import { SdBusyProviderTestHost } from "./sd-busy-test.fixture";

function setupHost() {
  TestBed.configureTestingModule({ imports: [SdBusyProviderTestHost] });
  const fixture = TestBed.createComponent(SdBusyProviderTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function flushSync(fixture: any): void {
  fixture.detectChanges();
  TestBed.flushEffects();
}

function getGlobalBusyContainer(): HTMLElement | null {
  return document.body.querySelector("sd-busy-container");
}

afterEach(() => {
  for (const el of document.body.querySelectorAll("sd-busy-container")) {
    el.remove();
  }
});

describe("Feature 3.4 Slice 1: SdBusyProvider 전역 busy 카운팅", () => {
  // Acceptance: globalBusyCount 0→1 증가 시 전역 busy 활성화
  it("globalBusyCount가 0에서 1로 증가하면 body의 sd-busy-container의 busy가 true가 되고 인디케이터가 표시된다", () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdBusyProvider);

    expect(provider.globalBusyCount()).toBe(0);

    provider.globalBusyCount.update((v) => v + 1);
    flushSync(fixture);

    const container = getGlobalBusyContainer();
    expect(container).not.toBeNull();
    expect(container!.getAttribute("data-sd-busy")).toBe("true");
    expect(container!.querySelector("._indicator")).not.toBeNull();
  });

  // Acceptance: globalBusyCount 1→0 감소 시 전역 busy 비활성화
  it("globalBusyCount가 1에서 0으로 감소하면 sd-busy-container의 busy가 false가 되고 인디케이터가 숨겨진다", () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdBusyProvider);

    provider.globalBusyCount.set(1);
    flushSync(fixture);

    provider.globalBusyCount.set(0);
    flushSync(fixture);

    const container = getGlobalBusyContainer();
    expect(container).not.toBeNull();
    expect(container!.hasAttribute("data-sd-busy")).toBe(false);
    expect(container!.querySelector("._indicator")).toBeNull();
  });

  // Acceptance: 동시 비동기 작업의 카운팅
  it("동시 비동기 작업에서 count가 0이 될 때만 busy가 비활성화된다", () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdBusyProvider);

    // 작업 A 시작: count 0→1
    provider.globalBusyCount.update((v) => v + 1);
    flushSync(fixture);
    expect(getGlobalBusyContainer()!.getAttribute("data-sd-busy")).toBe("true");

    // 작업 B 시작: count 1→2
    provider.globalBusyCount.update((v) => v + 1);
    flushSync(fixture);
    expect(getGlobalBusyContainer()!.getAttribute("data-sd-busy")).toBe("true");

    // 작업 A 완료: count 2→1
    provider.globalBusyCount.update((v) => v - 1);
    flushSync(fixture);
    expect(getGlobalBusyContainer()!.getAttribute("data-sd-busy")).toBe("true");

    // 작업 B 완료: count 1→0
    provider.globalBusyCount.update((v) => v - 1);
    flushSync(fixture);
    expect(getGlobalBusyContainer()!.hasAttribute("data-sd-busy")).toBe(false);
  });

  // Acceptance: 전역 busy에서 마우스 클릭 차단
  it("globalBusyCount가 0보다 크면 전역 컨테이너의 pointerEvents가 auto로 설정된다", () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdBusyProvider);

    provider.globalBusyCount.update((v) => v + 1);
    flushSync(fixture);

    const container = getGlobalBusyContainer();
    expect(container!.style.pointerEvents).toBe("auto");
  });

  // Acceptance: busy 해제 시 인터랙션 복원
  it("globalBusyCount가 0이면 전역 컨테이너의 pointerEvents가 none으로 설정된다", () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdBusyProvider);

    provider.globalBusyCount.update((v) => v + 1);
    flushSync(fixture);

    provider.globalBusyCount.update((v) => v - 1);
    flushSync(fixture);

    const container = getGlobalBusyContainer();
    expect(container!.style.pointerEvents).toBe("none");
  });
});
