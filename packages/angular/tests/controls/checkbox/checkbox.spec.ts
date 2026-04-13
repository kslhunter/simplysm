import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdCheckboxDefaultTest,
  SdCheckboxCheckedTest,
  SdCheckboxRadioTest,
  SdCheckboxRadioCheckedTest,
  SdCheckboxDisabledTest,
  SdCheckboxCanChangeAllowTest,
  SdCheckboxCanChangeDenyTest,
  SdCheckboxPropagationTest,
} from "./sd-checkbox-test.fixture";

describe("Feature 2.5 Slice 1: sd-checkbox", () => {
  it("체크박스 클릭으로 체크 — value가 false→true로 변경되고 인디케이터가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxDefaultTest] })
      .createComponent(SdCheckboxDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    expect(host.getAttribute("data-sd-checked")).toBe("false");

    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
    expect(host.getAttribute("data-sd-checked")).toBe("true");

    const indicator = host.querySelector("._indicator") as HTMLElement;
    expect(indicator).toBeTruthy();
  });

  it("체크된 체크박스 클릭으로 해제 — value가 true→false로 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxCheckedTest] })
      .createComponent(SdCheckboxCheckedTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    expect(host.getAttribute("data-sd-checked")).toBe("true");

    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(false);
    expect(host.getAttribute("data-sd-checked")).toBe("false");
  });

  it("Space 키로 체크박스 토글 — value가 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxDefaultTest] })
      .createComponent(SdCheckboxDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    host.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
  });

  it("커스텀 아이콘 — 기본 체크 아이콘이 인디케이터에 존재한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxDefaultTest] })
      .createComponent(SdCheckboxDefaultTest);
    fixture.detectChanges();

    const ngIcon = fixture.nativeElement.querySelector("sd-checkbox ._indicator ng-icon");
    expect(ngIcon).toBeTruthy();
  });

  it("라디오 모드 클릭 — value가 true로 설정되고 data-sd-radio=true이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxRadioTest] })
      .createComponent(SdCheckboxRadioTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    expect(host.getAttribute("data-sd-radio")).toBe("true");

    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
  });

  it("이미 선택된 라디오 모드 클릭 — value가 true로 유지된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxRadioCheckedTest] })
      .createComponent(SdCheckboxRadioCheckedTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
  });

  it("라디오 모드 Space 키 — value가 true로 설정된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxRadioTest] })
      .createComponent(SdCheckboxRadioTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    host.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
  });

  it("canChangeFn이 true 반환 — value가 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxCanChangeAllowTest] })
      .createComponent(SdCheckboxCanChangeAllowTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
  });

  it("canChangeFn이 false 반환 — value가 변경되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxCanChangeDenyTest] })
      .createComponent(SdCheckboxCanChangeDenyTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(false);
  });

  it("disabled 체크박스 클릭 — value가 변경되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxDisabledTest] })
      .createComponent(SdCheckboxDisabledTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    expect(host.getAttribute("data-sd-disabled")).toBe("true");

    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(false);
  });

  it("tabindex=0이 설정되어 포커스 가능하다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxDefaultTest] })
      .createComponent(SdCheckboxDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    expect(host.getAttribute("tabindex")).toBe("0");
  });

  it("ng-content로 라벨 텍스트가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxDefaultTest] })
      .createComponent(SdCheckboxDefaultTest);
    fixture.detectChanges();

    const contents = fixture.nativeElement.querySelector("sd-checkbox ._contents") as HTMLElement;
    expect(contents.textContent.trim()).toBe("Label");
  });
});

describe("Feature 1.2: SdCheckbox stopPropagation (CONSIST-001)", () => {
  it("클릭 이벤트가 상위 요소로 전파되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxPropagationTest] })
      .createComponent(SdCheckboxPropagationTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
    expect(fixture.componentInstance.parentClicked).toBe(false);
  });
});

// region FIX-2 Slice 4: checkbox Space 키 preventDefault (CONSIST-005)

describe("FIX-2 Slice 4: checkbox Space 키 preventDefault (CONSIST-005)", () => {
  it("Space 키 시 event.preventDefault()가 호출된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxDefaultTest] })
      .createComponent(SdCheckboxDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-checkbox") as HTMLElement;
    const event = new KeyboardEvent("keydown", { key: " ", cancelable: true });
    host.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.value()).toBe(true);
  });
});

// endregion
