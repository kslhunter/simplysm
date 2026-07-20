import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdDropdownTestDefault,
  SdDropdownTestDisabled,
  SdDropdownTestScrollable,
  SdDropdownTestSelfDisabling,
  SdDropdownTestWithTabbable,
} from "./sd-dropdown-test.fixture";
import { SdDropdown } from "../../../src/controls/dropdown/sd-dropdown";
import "@simplysm/core-browser";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
  });
}

function isPopupInBody(): boolean {
  // 팝업이 document.body의 직접 자식인지 확인 (append된 상태)
  return Array.from(document.body.children).some(
    (el) => el.tagName.toLowerCase() === "sd-dropdown-popup",
  );
}

describe("Feature 3.1 Slice 1: 컴포넌트 기본 구조 + 클릭 토글", () => {
  // Acceptance: 닫힌 드롭다운 클릭 시 팝업이 열린다
  it("닫힌 드롭다운 클릭 시 팝업이 document.body에 추가되고 표시된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(true);
  });

  // Acceptance: 열린 드롭다운 클릭 시 팝업이 닫힌다
  it("열린 드롭다운 클릭 시 팝업이 document.body에서 제거된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;

    // 열기
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // 닫기
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(false);
  });

  // Acceptance: disabled 드롭다운은 동작하지 않는다
  it("disabled 드롭다운 클릭 시 팝업이 열리지 않고 tabindex가 없다", () => {
    setupTestBed(SdDropdownTestDisabled);
    const fixture = TestBed.createComponent(SdDropdownTestDisabled);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    expect(dropdown.getAttribute("tabindex")).toBeNull();

    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(false);
  });

  // Unit: 클릭 시 open 시그널이 토글된다
  it("클릭 시 open 시그널이 false→true로 변경된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdownEl = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    const dropdownDebug = fixture.debugElement.query(
      (de) => de.nativeElement === dropdownEl,
    );
    const dropdownInstance = dropdownDebug.componentInstance as SdDropdown;

    expect(dropdownInstance.open()).toBe(false);

    dropdownEl.click();
    fixture.detectChanges();

    expect(dropdownInstance.open()).toBe(true);
  });

  // Unit: disabled 상태에서 클릭해도 open이 변하��� 않는다
  it("disabled 상태에서 클릭해도 open 시그널이 false를 유지한���", () => {
    setupTestBed(SdDropdownTestDisabled);
    const fixture = TestBed.createComponent(SdDropdownTestDisabled);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdownEl = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    const dropdownDebug = fixture.debugElement.query(
      (de) => de.nativeElement === dropdownEl,
    );
    const dropdownInstance = dropdownDebug.componentInstance as SdDropdown;

    dropdownEl.click();
    fixture.detectChanges();

    expect(dropdownInstance.open()).toBe(false);
  });

  // Unit: disabled=true이면 host에 tabindex가 없다
  it("disabled=true이면 tabindex 속성이 설정되지 않는다", () => {
    setupTestBed(SdDropdownTestDisabled);
    const fixture = TestBed.createComponent(SdDropdownTestDisabled);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    expect(dropdown.getAttribute("tabindex")).toBeNull();
  });

  // Unit: disabled=false이면 host에 tabindex=0이 있다
  it("disabled=false이면 tabindex=0이 설정된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    expect(dropdown.getAttribute("tabindex")).toBe("0");
  });

  // Acceptance: ��롭다운이 열린 상태에서 파괴되면 팝업이 제거���다
  it("드롭다운이 열린 상태에서 파괴되면 document.body에서 팝업이 제거된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;

    // 열기
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(true);

    // 파괴
    fixture.destroy();

    expect(isPopupInBody()).toBe(false);
  });
});

describe("Feature 3.1 Slice 2: 위치 자동 배치", () => {
  function openDropdown(fixture: any): HTMLElement {
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    return dropdown;
  }

  // Acceptance: 상반부+좌반부 → 아래-좌측 배치
  it("드롭다운이 뷰포트 상반부+좌반부이면 팝업이 아래-좌측에 표시된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    // 상반부+좌반부로 위치 설정
    Object.defineProperty(dropdown, "offsetHeight", { value: 30, configurable: true });
    Object.defineProperty(dropdown, "offsetWidth", { value: 200, configurable: true });
    vi.spyOn(dropdown, "getBoundingClientRect").mockReturnValue({
      top: 100, left: 50, bottom: 130, right: 250, width: 200, height: 30, x: 50, y: 100,
      toJSON: () => ({}),
    });

    openDropdown(fixture);

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    expect(popup).not.toBeNull();
    // 아래에 배치: top이 설정됨, bottom은 비어있음
    expect(popup.style.top).not.toBe("");
    expect(popup.style.bottom).toBe("");
    // 좌측 정렬: left가 설정됨, right는 비어있음
    expect(popup.style.left).not.toBe("");
    expect(popup.style.right).toBe("");
  });

  // Acceptance: 하반부+우반부 → 위-우측 배치
  it("드롭다운이 뷰포트 하반부+우반부이면 팝업이 위-우측에 표시된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    Object.defineProperty(dropdown, "offsetHeight", { value: 30, configurable: true });
    Object.defineProperty(dropdown, "offsetWidth", { value: 200, configurable: true });
    // 하반부+우반부: top * 2 > innerHeight, left * 2 > innerWidth
    // 뷰포트 크기에 따라 중앙보다 큰 값 사용
    vi.spyOn(dropdown, "getBoundingClientRect").mockReturnValue({
      top: ih * 0.8, left: iw * 0.8, bottom: ih * 0.8 + 30, right: iw * 0.8 + 200,
      width: 200, height: 30, x: iw * 0.8, y: ih * 0.8,
      toJSON: () => ({}),
    });

    openDropdown(fixture);

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    expect(popup).not.toBeNull();
    // 위에 배치: bottom이 설정됨, top은 비어있음
    expect(popup.style.top).toBe("");
    expect(popup.style.bottom).not.toBe("");
    // 우측 정렬: right가 설정됨, left는 비어있음
    expect(popup.style.left).toBe("");
    expect(popup.style.right).not.toBe("");
  });

  // Acceptance: 팝업 최소 너비 = 드롭다운 너비
  it("팝업의 최소 너비가 드롭다운 너비와 같다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    Object.defineProperty(dropdown, "offsetWidth", { value: 200, configurable: true });
    Object.defineProperty(dropdown, "offsetHeight", { value: 30, configurable: true });

    openDropdown(fixture);

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    expect(popup.style.minWidth).toBe("200px");
  });

  // Acceptance: 부모 요소 스크롤 시 팝업 위치가 재계산된다
  it("부모 요소 스크롤 시 팝업 위치가 갱신된다", () => {
    setupTestBed(SdDropdownTestScrollable);
    const fixture = TestBed.createComponent(SdDropdownTestScrollable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    Object.defineProperty(dropdown, "offsetHeight", { value: 30, configurable: true });
    Object.defineProperty(dropdown, "offsetWidth", { value: 200, configurable: true });

    openDropdown(fixture);

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const topBefore = popup.style.top;

    // 드롭다운 위치가 바뀐 것을 시뮬레이션
    vi.spyOn(dropdown, "getBoundingClientRect").mockReturnValue({
      top: 50, left: 50, bottom: 80, right: 250, width: 200, height: 30, x: 50, y: 50,
      toJSON: () => ({}),
    });

    // 스크롤 컨테이너에서 스크롤 이벤트 발생
    const scrollContainer = fixture.nativeElement.querySelector(".scroll-container") as HTMLElement;
    scrollContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    // 위치가 변경되었는지 확인 (정확한 값보다는 갱신되었는지)
    expect(popup.style.top).not.toBe(topBefore);
  });

  // Acceptance: 무관한 요소 스크롤 시 팝업 위치가 변경되지 않는다
  it("무관한 요소 스크롤 시 팝업 위치가 변경되지 않는다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    Object.defineProperty(dropdown, "offsetHeight", { value: 30, configurable: true });
    Object.defineProperty(dropdown, "offsetWidth", { value: 200, configurable: true });

    openDropdown(fixture);

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const topBefore = popup.style.top;
    const leftBefore = popup.style.left;

    // 무관한 요소에서 스크롤 이벤트 발생
    const unrelatedDiv = document.createElement("div");
    document.body.appendChild(unrelatedDiv);
    unrelatedDiv.dispatchEvent(new Event("scroll", { bubbles: false }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(popup.style.top).toBe(topBefore);
    expect(popup.style.left).toBe(leftBefore);

    unrelatedDiv.remove();
  });

  // Unit: 열린 팝업에 opacity=1, pointerEvents=auto, transform=none이 설정된다
  it("열린 팝업에 표시 관련 스타일이 적용된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    openDropdown(fixture);

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    expect(popup.style.opacity).toBe("1");
    expect(popup.style.pointerEvents).toBe("auto");
    expect(popup.style.transform).toBe("none");
  });
});

describe("Feature 3.1 Slice 3: 외부 포커스 닫기", () => {
  // Acceptance: 외부 요소 클릭 시 팝업이 닫힌다
  it("팝업/드롭다운 외부 요소 클릭 시 팝업이 닫힌다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(true);

    // 외부 버튼으로 포커스 이동 (blur 이벤트 발생)
    const outsideBtn = fixture.nativeElement.querySelector(".outside-button") as HTMLElement;
    dropdown.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: outsideBtn, bubbles: false }),
    );
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(false);
  });

  // Acceptance: 팝업 내부 포커스 이동 시 팝업이 유지된다
  it("팝업 내부 요소 간 포커스 이동 시 팝업이 유지된다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const popupInput = popup.querySelector(".popup-input") as HTMLElement;
    const popupButton = popup.querySelector(".popup-button") as HTMLElement;

    // 팝업 내 input에서 button으로 포커스 이동
    popupInput.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: popupButton, bubbles: false }),
    );
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(true);
  });

  // Acceptance: 드롭다운 자체로 포커스 이동 시 팝업이 유지된다
  it("드롭다운 자체로 포커스 이동 시 팝업이 유지된다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const popupInput = popup.querySelector(".popup-input") as HTMLElement;

    // 팝업 내 input에서 드롭다운으로 포커스 이동
    popupInput.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: dropdown, bubbles: false }),
    );
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(true);
  });

  // Unit: contains()로 내부 판별이 정확히 동작한다
  it("팝업 자식 요소로 포커스 이동 시 내부로 판별되어 닫히지 않는다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const popupButton = popup.querySelector(".popup-button") as HTMLElement;

    // 드롭다운에서 팝업 내부 버튼으로 포커스 이동
    dropdown.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: popupButton, bubbles: false }),
    );
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(true);
  });
});

describe("팝업 내부 요소가 렌더 중 disabled 될 때 (issue #40)", () => {
  /**
   * 포커스를 가진 native button 이 렌더 도중 disabled 되면 브라우저가 동기 blur 를 발사한다.
   * 이 blur 는 Angular 렌더 콜스택 안에서 dropdown 의 capture 리스너를 실행시킨다.
   *
   * NG0600 은 detectChanges() 밖으로 throw 되지 않고 window "error" 로만 새어 나오므로
   * 그 경로를 수집해 단언한다.
   */
  function collectWindowErrors(): { messages: string[]; stop: () => void } {
    const messages: string[] = [];
    const onWindowError = (event: ErrorEvent): void => {
      messages.push(event.message);
    };
    window.addEventListener("error", onWindowError);
    return {
      messages,
      stop: () => {
        window.removeEventListener("error", onWindowError);
      },
    };
  }

  function openAndClickSelfDisablingButton(mouseoverTarget: "button" | "text" | "none"): {
    errors: string[];
    popupOpen: boolean;
  } {
    setupTestBed(SdDropdownTestSelfDisabling);
    const fixture = TestBed.createComponent(SdDropdownTestSelfDisabling);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const targetBtn = popup.querySelector(".self-disabling-button") as HTMLButtonElement;
    const textEl = popup.querySelector(".popup-text") as HTMLElement;

    if (mouseoverTarget === "button") {
      targetBtn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    } else if (mouseoverTarget === "text") {
      textEl.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    }

    const collected = collectWindowErrors();
    targetBtn.focus();
    targetBtn.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    collected.stop();

    return { errors: collected.messages, popupOpen: isPopupInBody() };
  }

  // Acceptance: 커서가 팝업 밖(키보드 조작 경로)이어도 크래시 없이 팝업이 유지된다
  it("커서가 팝업 밖일 때 버튼이 자기를 disabled 시켜도 NG0600 없이 팝업이 유지된다", () => {
    const result = openAndClickSelfDisablingButton("none");

    expect(result.errors.filter((msg) => msg.includes("NG0600"))).toEqual([]);
    expect(result.popupOpen).toBe(true);
  });

  // Acceptance: 커서가 팝업 내부여도 동일하게 동작한다
  it("커서가 팝업 내부일 때 버튼이 자기를 disabled 시켜도 NG0600 없이 팝업이 유지된다", () => {
    const result = openAndClickSelfDisablingButton("text");

    expect(result.errors.filter((msg) => msg.includes("NG0600"))).toEqual([]);
    expect(result.popupOpen).toBe(true);
  });
});

describe("Feature 3.1 Slice 4: 키보드 네비게이션", () => {
  function pressKey(el: HTMLElement, key: string): void {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }

  // Acceptance: 닫힌 상태에서 ArrowDown → 팝업 열림
  it("닫힌 상태에서 ArrowDown 키를 누르면 팝업이 열린다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    pressKey(dropdown, "ArrowDown");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(true);
  });

  // Acceptance: 열린 상태에서 ArrowDown → 팝업 내 첫 포커스 요소로 이동
  it("열린 상태에서 ArrowDown 키를 누르면 팝업 내 첫 포커스 가능 요소에 포커스가 이동한다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const popupInput = popup.querySelector(".popup-input") as HTMLElement;

    pressKey(dropdown, "ArrowDown");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(document.activeElement).toBe(popupInput);
  });

  // Acceptance: 열린 상태에서 ArrowUp → 팝업 닫힘
  it("열린 상태에서 ArrowUp 키를 누르면 팝업이 닫힌다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    pressKey(dropdown, "ArrowUp");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(false);
  });

  // Acceptance: Space 키 토글
  it("Space 키로 드롭다운을 토글한다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;

    // 열기
    pressKey(dropdown, " ");
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(isPopupInBody()).toBe(true);

    // 닫기
    pressKey(dropdown, " ");
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(isPopupInBody()).toBe(false);
  });

  // Acceptance: Escape (드롭다운에서)
  it("드롭다운에서 Escape 키로 팝업을 닫는다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    pressKey(dropdown, "Escape");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(false);
  });

  // Acceptance: Escape (팝업에서)
  it("팝업에서 Escape 키로 팝업을 닫는다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const innerDiv = popup.querySelector("div") as HTMLElement;
    pressKey(innerDiv, "Escape");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(false);
  });

  // Acceptance: 팝업 닫힘 시 포커스가 드롭다운으로 복귀���다
  it("팝업 닫힘 시 포커스가 드롭다운으로 복귀한다", () => {
    setupTestBed(SdDropdownTestWithTabbable);
    const fixture = TestBed.createComponent(SdDropdownTestWithTabbable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const popupInput = popup.querySelector(".popup-input") as HTMLInputElement;
    popupInput.focus();

    const innerDiv = popup.querySelector("div") as HTMLElement;
    pressKey(innerDiv, "Escape");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(document.activeElement).toBe(dropdown);
  });

  // Unit: Ctrl+ArrowDown��� 팝업을 열지 않는다
  it("Ctrl+ArrowDown은 팝업을 열지 않는다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", ctrlKey: true, bubbles: true }),
    );
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(isPopupInBody()).toBe(false);
  });
});

// region Feature 3.2 Slice 1: 드롭다운 위치 viewport 기준 + 스타일 리셋

describe("Feature 3.2 Slice 1: 드롭다운 위치 viewport 기준 + 스타일 리셋", () => {
  // Acceptance: 스크롤된 상태에서 팝업이 viewport 기준으로 배치된다
  it("getRelativeOffset가 아닌 getBoundingClientRect 기준으로 팝업이 배치된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    Object.defineProperty(dropdown, "offsetHeight", { value: 30, configurable: true });
    Object.defineProperty(dropdown, "offsetWidth", { value: 200, configurable: true });

    // getBoundingClientRect는 viewport 기준 {top: 100}을 반환
    vi.spyOn(dropdown, "getBoundingClientRect").mockReturnValue({
      top: 100, left: 50, bottom: 130, right: 250, width: 200, height: 30, x: 50, y: 100,
      toJSON: () => ({}),
    });
    // getRelativeOffset는 document 기준 {top: 600}을 반환 (scroll 포함)
    (dropdown as any).getRelativeOffset = () => ({ top: 600, left: 350 });

    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    expect(popup).not.toBeNull();

    // viewport 기준이면 top=100이므로 isPlaceBottom=false → top 스타일 사용
    // document 기준이면 top=600이므로 isPlaceBottom=true → bottom 스타일 사용
    expect(popup.style.top).toBe("132px"); // rect.bottom(130) + gap(2)
    expect(popup.style.bottom).toBe("");
    expect(popup.style.left).toBe("50px"); // rect.left
    expect(popup.style.right).toBe("");
  });

  // Acceptance: 팝업 닫힘 시 위치 인라인 스타일이 리셋된다
  // (maxHeight/maxWidth/overflow는 Feature 3.1에서 제거 — v12 복원으로 sd-dropdown-popup이 자체 높이 제한 담당)
  it("팝업 닫힘 시 위치 인라인 스타일이 리셋된다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;

    // 열기
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    expect(popup).not.toBeNull();

    // 닫기
    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // _removePopup에서 리셋되어야 하는 스타일
    expect(popup.style.top).toBe("");
    expect(popup.style.bottom).toBe("");
    expect(popup.style.left).toBe("");
    expect(popup.style.right).toBe("");
    expect(popup.style.minWidth).toBe("");
    expect(popup.style.opacity).toBe("");
  });

  // Unit: 수평 좌표도 viewport 기준 (getBoundingClientRect.right 사용)
  it("우반부 배치 시 right 계산이 rect.right 기준이다", () => {
    setupTestBed(SdDropdownTestDefault);
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    const iw = window.innerWidth;
    Object.defineProperty(dropdown, "offsetHeight", { value: 30, configurable: true });
    Object.defineProperty(dropdown, "offsetWidth", { value: 200, configurable: true });

    // 우반부 배치
    vi.spyOn(dropdown, "getBoundingClientRect").mockReturnValue({
      top: 100, left: iw * 0.8, bottom: 130, right: iw * 0.8 + 200,
      width: 200, height: 30, x: iw * 0.8, y: 100,
      toJSON: () => ({}),
    });
    // getRelativeOffset는 다른 값을 반환하도록 설정
    (dropdown as any).getRelativeOffset = () => ({ top: 100, left: iw * 0.8 + 300 });

    dropdown.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    // viewport 기준: right = innerWidth - rect.right
    const expectedRight = iw - (iw * 0.8 + 200);
    expect(popup.style.right).toBe(`${expectedRight}px`);
  });
});

// endregion

// region FIX-2 Slice 3: dropdown popup 높이 제한 (Feature 3.1 v12 복원)
// maxHeight/maxWidth/overflow는 sd-dropdown에서 제거됨.
// 높이 제한은 sd-dropdown-popup의 onResize()가 담당 (300px 고정 제한).
// 관련 테스트: dropdown-popup-height.acc.spec.ts, dropdown-popup-height.spec.ts
// endregion
