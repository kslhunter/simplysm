import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdNumpadDefaultTest,
  SdNumpadMinusTest,
  SdNumpadEnterTest,
  SdNumpadEnterRequiredTest,
  SdNumpadInputDisabledTest,
  SdNumpadNoMinusTest,
  SdNumpadNoEnterTest,
} from "./sd-numpad-test.fixture";
import { SdNumpad } from "../../../../src/ui/form/input/sd-numpad";

// region Helper

function clickButton(host: HTMLElement, label: string): void {
  const buttons = host.querySelectorAll("sd-button");
  for (const btn of Array.from(buttons)) {
    if (btn.textContent.trim() === label) {
      (btn.querySelector("button") as HTMLButtonElement).click();
      return;
    }
  }
  throw new Error(`Button "${label}" not found`);
}

function getNumpadControl(fixture: any): SdNumpad {
  const numpadEl = fixture.nativeElement.querySelector("sd-numpad");
  return fixture.debugElement.query(
    (de: any) => de.nativeElement === numpadEl,
  ).componentInstance as SdNumpad;
}

// endregion

// region Unit Tests: onButtonClick logic

describe("SdNumpad.onButtonClick unit tests", () => {
  it("숫자 키를 누르면 text에 해당 숫자가 추가된다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.onButtonClick("7");
    expect(ctrl.text()).toBe("7");
  });

  it("빈 텍스트에서 C 키를 누르면 text가 undefined이다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.onButtonClick("C");
    expect(ctrl.text()).toBeUndefined();
  });

  it("텍스트가 있을 때 BS 키를 누르면 마지막 문자가 제거된다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("789");
    ctrl.onButtonClick("BS");
    expect(ctrl.text()).toBe("78");
  });

  it("한 자리 텍스트에서 BS를 누르면 undefined가 된다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("5");
    ctrl.onButtonClick("BS");
    expect(ctrl.text()).toBeUndefined();
  });

  it("빈 텍스트에서 BS를 누르면 undefined를 유지한다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.onButtonClick("BS");
    expect(ctrl.text()).toBeUndefined();
  });

  it("Minus 키를 누르면 텍스트 앞에 -가 토글된다 (양수→음수)", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("5");
    ctrl.onButtonClick("Minus");
    expect(ctrl.text()).toBe("-5");
  });

  it("Minus 키를 누르면 텍스트 앞에 -가 토글된다 (음수→양수)", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("-5");
    ctrl.onButtonClick("Minus");
    expect(ctrl.text()).toBe("5");
  });

  it("빈 텍스트에서 Minus를 누르면 -가 된다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.onButtonClick("Minus");
    expect(ctrl.text()).toBe("-");
  });

  it("소수점 키를 누르면 .이 추가된다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("5");
    ctrl.onButtonClick(".");
    expect(ctrl.text()).toBe("5.");
  });
});

// endregion

// region Acceptance Tests: Numpad Scenarios

describe("Feature 5.2 Slice 1: SdNumpad", () => {
  it("Scenario: 숫자 버튼 클릭으로 텍스트 추가", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    clickButton(host, "7");
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    expect(ctrl.text()).toBe("7");
    expect(fixture.componentInstance.value()).toBe(7);
  });

  it("Scenario: 여러 숫자 연속 입력", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    const ctrl = getNumpadControl(fixture);

    // 먼저 text를 "12"로 설정
    ctrl.text.set("12");
    fixture.detectChanges();
    TestBed.flushEffects();

    clickButton(host, "3");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBe("123");
    expect(fixture.componentInstance.value()).toBe(123);
  });

  it("Scenario: 소수점 입력", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    const ctrl = getNumpadControl(fixture);

    ctrl.text.set("5");
    fixture.detectChanges();
    TestBed.flushEffects();

    clickButton(host, ".");
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(ctrl.text()).toBe("5.");

    clickButton(host, "3");
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(ctrl.text()).toBe("5.3");
    expect(fixture.componentInstance.value()).toBe(5.3);
  });

  it("Scenario: 클리어(C) 버튼으로 초기화", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("456");
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    // C button has ng-icon inside, find by the eraser icon button
    const buttons = host.querySelectorAll("sd-button");
    // The C button is the one with tx-theme-danger-default class
    let cBtn: HTMLButtonElement | null = null;
    for (const btn of Array.from(buttons)) {
      const innerBtn = btn.querySelector("button");
      if (innerBtn?.classList.contains("tx-theme-danger-default")) {
        cBtn = innerBtn;
        break;
      }
    }
    expect(cBtn).toBeTruthy();
    cBtn!.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBeUndefined();
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it("Scenario: 백스페이스(BS) 버튼으로 마지막 문자 제거", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("789");
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    // BS button has tx-theme-warning-default class
    const buttons = host.querySelectorAll("sd-button");
    let bsBtn: HTMLButtonElement | null = null;
    for (const btn of Array.from(buttons)) {
      const innerBtn = btn.querySelector("button");
      if (innerBtn?.classList.contains("tx-theme-warning-default")) {
        bsBtn = innerBtn;
        break;
      }
    }
    expect(bsBtn).toBeTruthy();
    bsBtn!.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBe("78");
    expect(fixture.componentInstance.value()).toBe(78);
  });

  it("Scenario: 빈 텍스트에서 백스페이스 클릭", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    const buttons = host.querySelectorAll("sd-button");
    let bsBtn: HTMLButtonElement | null = null;
    for (const btn of Array.from(buttons)) {
      const innerBtn = btn.querySelector("button");
      if (innerBtn?.classList.contains("tx-theme-warning-default")) {
        bsBtn = innerBtn;
        break;
      }
    }
    bsBtn!.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    expect(ctrl.text()).toBeUndefined();
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it("Scenario: 마이너스(-) 버튼으로 부호 토글", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadMinusTest] });
    const fixture = TestBed.createComponent(SdNumpadMinusTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("5");
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    clickButton(host, "-");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBe("-5");
    expect(fixture.componentInstance.value()).toBe(-5);
  });

  it("Scenario: 음수에서 마이너스 버튼으로 양수 전환", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadMinusTest] });
    const fixture = TestBed.createComponent(SdNumpadMinusTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    ctrl.text.set("-5");
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    clickButton(host, "-");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBe("5");
    expect(fixture.componentInstance.value()).toBe(5);
  });

  it("Scenario: 빈 텍스트에서 마이너스 클릭", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadMinusTest] });
    const fixture = TestBed.createComponent(SdNumpadMinusTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    clickButton(host, "-");
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    expect(ctrl.text()).toBe("-");
  });

  it("Scenario: Enter 버튼 클릭으로 확인 이벤트 발생", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadEnterTest] });
    const fixture = TestBed.createComponent(SdNumpadEnterTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    fixture.componentInstance.value.set(42);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    clickButton(host, "ENT");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.enterClicked).toBe(true);
  });

  it("Scenario: required이고 value 없을 때 Enter 버튼 비활성", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadEnterRequiredTest] });
    const fixture = TestBed.createComponent(SdNumpadEnterRequiredTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    const buttons = host.querySelectorAll("sd-button");
    let entBtn: HTMLButtonElement | null = null;
    for (const btn of Array.from(buttons)) {
      if (btn.textContent.trim() === "ENT") {
        entBtn = btn.querySelector("button") as HTMLButtonElement;
        break;
      }
    }
    expect(entBtn).toBeTruthy();
    expect(entBtn!.disabled).toBe(true);
  });

  it("Scenario: 외부에서 value를 변경하면 텍스트가 동기화된다", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    fixture.componentInstance.value.set(100);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    expect(ctrl.text()).toBe("100");

    fixture.componentInstance.value.set(200);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBe("200");
  });

  it("Scenario: inputDisabled이면 텍스트 입력 필드가 비활성, 숫자 버튼은 동작", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadInputDisabledTest] });
    const fixture = TestBed.createComponent(SdNumpadInputDisabledTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    const textfield = host.querySelector("sd-textfield") as HTMLElement;
    expect(textfield.getAttribute("data-sd-disabled")).toBe("true");

    // 숫자 버튼은 여전히 동작한다
    clickButton(host, "5");
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);
    expect(ctrl.text()).toBe("5");
  });

  it("Scenario: useMinusButton이 false이면 마이너스 버튼 미표시", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadNoMinusTest] });
    const fixture = TestBed.createComponent(SdNumpadNoMinusTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    const buttons = host.querySelectorAll("sd-button");
    const minusBtn = Array.from(buttons).find(
      (btn) => btn.textContent.trim() === "-",
    );
    expect(minusBtn).toBeUndefined();
  });

  it("Scenario: useEnterButton이 false이면 Enter 버튼 미표시", () => {
    TestBed.configureTestingModule({ imports: [SdNumpadNoEnterTest] });
    const fixture = TestBed.createComponent(SdNumpadNoEnterTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-numpad") as HTMLElement;
    const buttons = host.querySelectorAll("sd-button");
    const entBtn = Array.from(buttons).find(
      (btn) => btn.textContent.trim() === "ENT",
    );
    expect(entBtn).toBeUndefined();
  });
});

// endregion

// region FIX-2 Slice 1: numpad 소수점 중간 입력 보호 (LOGIC-009)

describe("FIX-2 Slice 1: numpad 소수점 중간 입력 보호 (LOGIC-009)", () => {
  it('"1." 입력 시 text가 "1."로 유지되고 value는 이전 값이 유지된다', () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);

    ctrl.onButtonClick("1");
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(ctrl.text()).toBe("1");
    expect(fixture.componentInstance.value()).toBe(1);

    ctrl.onButtonClick(".");
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(ctrl.text()).toBe("1.");
    // value stays 1 (trailing dot is intermediate state)
  });

  it('"1.5" 입력 시 value가 1.5로 동기화된다', () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);

    ctrl.onButtonClick("1");
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.onButtonClick(".");
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.onButtonClick("5");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBe("1.5");
    expect(fixture.componentInstance.value()).toBe(1.5);
  });

  it('"0.0" 입력 시 text가 "0.0"으로 유지된다', () => {
    TestBed.configureTestingModule({ imports: [SdNumpadDefaultTest] });
    const fixture = TestBed.createComponent(SdNumpadDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getNumpadControl(fixture);

    ctrl.onButtonClick("0");
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.onButtonClick(".");
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.onButtonClick("0");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.text()).toBe("0.0");
    expect(fixture.componentInstance.value()).toBe(0);
  });
});

// endregion
