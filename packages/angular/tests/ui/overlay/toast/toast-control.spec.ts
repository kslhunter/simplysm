import { describe, it, expect } from "vitest";
import { type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdToastTestDefault, SdToastTestProgress } from "./sd-toast-test.fixture";

function setup<T>(component: Type<T>) {
  TestBed.configureTestingModule({ imports: [component] });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function getToast(fixture: any): HTMLElement {
  return fixture.nativeElement.querySelector("sd-toast") as HTMLElement;
}

describe("Feature 3.3 Slice 1: SdToastControl 렌더링", () => {
  // Acceptance: info 토스트 표시
  it("info 테마의 토스트가 표시되고, role=status + aria-live=polite가 설정된다", () => {
    const fixture = setup(SdToastTestDefault);
    const toast = getToast(fixture);

    expect(toast.getAttribute("data-sd-theme")).toBe("info");
    expect(toast.getAttribute("data-sd-open")).toBe("true");
    expect(toast.getAttribute("role")).toBe("status");
    expect(toast.getAttribute("aria-live")).toBe("polite");

    const messageEl = toast.querySelector("._message");
    expect(messageEl).not.toBeNull();
    expect(messageEl!.textContent).toContain("테스트 메시지");
  });

  // Unit: 비심각도 테마(primary)에는 ARIA role/aria-live가 설정되지 않는다
  it("primary 테마에는 role, aria-live 속성이 설정되지 않는다", () => {
    const fixture = setup(SdToastTestDefault);
    fixture.componentInstance.theme.set("primary");
    fixture.detectChanges();
    TestBed.flushEffects();

    const toast = getToast(fixture);
    expect(toast.getAttribute("data-sd-theme")).toBe("primary");
    expect(toast.hasAttribute("role")).toBe(false);
    expect(toast.hasAttribute("aria-live")).toBe(false);
  });

  // Unit: progress 값이 변경되면 프로그래스 바 너비가 갱신된다
  it("progress 값이 변경되면 프로그래스 바 너비가 갱신된다", () => {
    const fixture = setup(SdToastTestProgress);
    const toast = getToast(fixture);

    let progressBar = toast.querySelector("._progress-bar") as HTMLElement;
    expect(progressBar.style.width).toBe("50%");

    fixture.componentInstance.progress.set(75);
    fixture.detectChanges();
    TestBed.flushEffects();

    progressBar = toast.querySelector("._progress-bar") as HTMLElement;
    expect(progressBar.style.width).toBe("75%");
  });

  // Acceptance: 프로그래스 바 표시
  it("useProgress=true이면 프로그래스 바가 표시되고, progress로 너비가 설정된다", () => {
    const fixture = setup(SdToastTestProgress);
    const toast = getToast(fixture);

    const progressBar = toast.querySelector("._progress-bar") as HTMLElement;
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe("50%");
  });

});
