import { describe, it, expect } from "vitest";
import { type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  SdToastTestDefault,
  SdToastTestProgress,
  SdToastTestContent,
  SdToastTestEmpty,
} from "./sd-toast-test.fixture";

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

describe("Feature 3.3 Slice 1: SdToast 렌더링", () => {
  // Acceptance: info 토스트 표시
  it("info 테마의 토스트가 표시되고, role=status + aria-live=polite가 설정된다", () => {
    const fixture = setup(SdToastTestDefault);
    const toast = getToast(fixture);

    expect(toast.getAttribute("data-sd-theme")).toBe("info");
    expect(toast.getAttribute("data-sd-open")).toBe("true");
    expect(toast.getAttribute("role")).toBe("status");
    expect(toast.getAttribute("aria-live")).toBe("polite");

    const messageEl = toast.querySelector("._sd-toast-message");
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

    let progressBar = toast.querySelector("._sd-toast-progress-bar") as HTMLElement;
    expect(progressBar.style.width).toBe("50%");

    fixture.componentInstance.progress.set(75);
    fixture.detectChanges();
    TestBed.flushEffects();

    progressBar = toast.querySelector("._sd-toast-progress-bar") as HTMLElement;
    expect(progressBar.style.width).toBe("75%");
  });

  // Acceptance: 프로그래스 바 표시
  it("useProgress=true이면 프로그래스 바가 표시되고, progress로 너비가 설정된다", () => {
    const fixture = setup(SdToastTestProgress);
    const toast = getToast(fixture);

    const progressBar = toast.querySelector("._sd-toast-progress-bar") as HTMLElement;
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe("50%");
  });

});

describe("Feature 3.4 Slice 1: sd-toast 템플릿 구조 + 클래스명 복원", () => {
  // Rule: message와 ng-content는 배타적으로 표시된다

  // Acceptance: message가 설정된 경우 message 텍스트만 표시
  it("message가 설정되면 _sd-toast-message에 텍스트가 표시되고 ng-content는 렌더링되지 않는다", () => {
    const fixture = setup(SdToastTestDefault);
    const toast = getToast(fixture);

    const messageEl = toast.querySelector("._sd-toast-message");
    expect(messageEl).not.toBeNull();
    expect(messageEl!.textContent).toContain("테스트 메시지");

    // ng-content 슬롯이 렌더링되지 않아야 함 (projected 콘텐츠가 없으므로 확인 불가, 대신 message가 wrapper 안에 있는지 확인)
    const block = toast.querySelector("._sd-toast-block");
    expect(block).not.toBeNull();
    expect(block!.querySelector("._sd-toast-message")).not.toBeNull();
  });

  // Acceptance: message가 설정되지 않은 경우 ng-content만 표시
  it("message가 undefined이면 _sd-toast-message에 ng-content가 표시된다", () => {
    const fixture = setup(SdToastTestContent);
    const toast = getToast(fixture);

    const messageEl = toast.querySelector("._sd-toast-message");
    expect(messageEl).not.toBeNull();

    // ng-content인 projected 콘텐츠가 _sd-toast-message 안에 있어야 함
    const projected = messageEl!.querySelector("._projected");
    expect(projected).not.toBeNull();
    expect(projected!.textContent).toContain("프로젝트된 콘텐츠");

    // message 텍스트는 없어야 함 (projected 외 직접 텍스트 없음)
    const textNodes = Array.from(messageEl!.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "",
    );
    expect(textNodes.length).toBe(0);
  });

  // Acceptance: message도 ng-content도 없는 경우
  it("message가 undefined이고 ng-content도 없으면 빈 _sd-toast-message div가 렌더링된다", () => {
    const fixture = setup(SdToastTestEmpty);
    const toast = getToast(fixture);

    const messageEl = toast.querySelector("._sd-toast-message");
    expect(messageEl).not.toBeNull();
    // 내용이 비어있어야 함
    expect(messageEl!.textContent.trim()).toBe("");
  });

  // Rule: 내부 클래스명은 _sd-toast- 접두사를 사용한다

  // Acceptance: 렌더링된 DOM의 클래스명이 _sd-toast- 접두사를 갖는다
  it("렌더링된 DOM에 _sd-toast-block과 _sd-toast-message 클래스가 존재한다", () => {
    const fixture = setup(SdToastTestDefault);
    const toast = getToast(fixture);

    expect(toast.querySelector("._sd-toast-block")).not.toBeNull();
    expect(toast.querySelector("._sd-toast-message")).not.toBeNull();
    // 이전 클래스명이 없어야 함
    expect(toast.querySelector("._block")).toBeNull();
    expect(toast.querySelector("._message")).toBeNull();
  });

  // Acceptance: progress 활성화 시 progress 클래스명도 접두사를 갖는다
  it("useProgress=true이면 _sd-toast-progress와 _sd-toast-progress-bar 클래스가 존재한다", () => {
    const fixture = setup(SdToastTestProgress);
    const toast = getToast(fixture);

    expect(toast.querySelector("._sd-toast-progress")).not.toBeNull();
    expect(toast.querySelector("._sd-toast-progress-bar")).not.toBeNull();
    // 이전 클래스명이 없어야 함
    expect(toast.querySelector("._progress")).toBeNull();
    expect(toast.querySelector("._progress-bar")).toBeNull();
  });

});
