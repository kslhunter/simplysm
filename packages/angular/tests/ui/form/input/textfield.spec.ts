import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTextfieldTextTest,
  SdTextfieldPasswordTest,
  SdTextfieldEmailTest,
  SdTextfieldDisabledTest,
  SdTextfieldReadonlyTest,
  SdTextfieldInlineTest,
  SdTextfieldPlaceholderTest,
  SdTextfieldTitleTest,
  SdTextfieldTitleFallbackTest,
  SdTextfieldNumberTest,
  SdTextfieldNumberNoCommaTest,
  SdTextfieldFormatTest,
  SdTextfieldDateTest,
  SdTextfieldMonthTest,
  SdTextfieldYearTest,
  SdTextfieldDatetimeTest,
  SdTextfieldDatetimeSecTest,
  SdTextfieldTimeTest,
  SdTextfieldTimeSecTest,
  SdTextfieldDatetimeReadonlyTest,
} from "./sd-textfield-test.fixture";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import { textfieldTypeHandlers } from "../../../../src/ui/form/input/sd-textfield-type-handlers";

// region Unit Tests: Handler parse/format/validate

describe("textfieldTypeHandlers unit tests", () => {
  describe("string type handler", () => {
    it("text parse는 입력 문자열을 그대로 반환한다", () => {
      expect(textfieldTypeHandlers.text.parse("hello", {})).toBe("hello");
    });

    it("text toControlValue는 문자열을 그대로 반환한다", () => {
      expect(textfieldTypeHandlers.text.toControlValue("hello", {})).toBe("hello");
    });

    it("text toDisplayText는 undefined를 반환한다", () => {
      expect(textfieldTypeHandlers.text.toDisplayText("hello", {})).toBeUndefined();
    });

    it("text controlType은 'text'이다", () => {
      expect(textfieldTypeHandlers.text.controlType).toBe("text");
    });

    it("password controlType은 'password'이다", () => {
      expect(textfieldTypeHandlers.password.controlType).toBe("password");
    });

    it("email controlType은 'email'이다", () => {
      expect(textfieldTypeHandlers.email.controlType).toBe("email");
    });

    it("color controlType은 'color'이다", () => {
      expect(textfieldTypeHandlers.color.controlType).toBe("color");
    });
  });

  describe("string type validation", () => {
    it("required=true, 값 없음 → 에러", () => {
      const errors = textfieldTypeHandlers.text.validate(undefined, { required: true });
      expect(errors).toContain("값을 입력하세요.");
    });

    it("required=false, 값 없음 → 에러 없음", () => {
      const errors = textfieldTypeHandlers.text.validate(undefined, { required: false });
      expect(errors).toHaveLength(0);
    });

    it("minlength 위반 → 에러", () => {
      const errors = textfieldTypeHandlers.text.validate("ab", { minlength: 3 });
      expect(errors).toContain("문자의 길이가 3보다 길거나 같아야 합니다.");
    });

    it("maxlength 위반 → 에러 (D2 버그 수정)", () => {
      const errors = textfieldTypeHandlers.text.validate("hello world", { maxlength: 5 });
      expect(errors).toContain("문자의 길이가 5보다 짧거나 같아야 합니다.");
    });

    it("maxlength 이내 → 에러 없음", () => {
      const errors = textfieldTypeHandlers.text.validate("hi", { maxlength: 5 });
      expect(errors).toHaveLength(0);
    });

    it("pattern 위반 → 에러", () => {
      const errors = textfieldTypeHandlers.text.validate("ABC", { pattern: "^[a-z]+$" });
      expect(errors).toContain("입력 값이 형식에 맞지 않습니다.");
    });

    it("pattern 일치 → 에러 없음", () => {
      const errors = textfieldTypeHandlers.text.validate("abc", { pattern: "^[a-z]+$" });
      expect(errors).toHaveLength(0);
    });
  });

  describe("number type handler", () => {
    it("parse는 숫자 문자열을 number로 반환한다", () => {
      expect(textfieldTypeHandlers.number.parse("1234", {})).toBe(1234);
    });

    it("parse는 콤마 포함 문자열에서 숫자를 추출한다", () => {
      expect(textfieldTypeHandlers.number.parse("1,234", {})).toBe(1234);
    });

    it("parse는 소수점 진행 중(끝이 .)이면 undefined를 반환한다", () => {
      expect(textfieldTypeHandlers.number.parse("1.", {})).toBeUndefined();
    });

    it("toControlValue는 콤마 포매팅한다 (기본)", () => {
      expect(textfieldTypeHandlers.number.toControlValue(1234, {})).toBe("1,234");
    });

    it("toControlValue는 콤마 없이 표시한다 (useNumberComma=false)", () => {
      expect(textfieldTypeHandlers.number.toControlValue(1234, { useNumberComma: false })).toBe(
        "1234",
      );
    });

    it("toDisplayText는 minDigits 설정 시 소수점 자릿수를 표시한다", () => {
      const text = textfieldTypeHandlers.number.toDisplayText(1, { minDigits: 2 });
      expect(text).toContain("1");
      expect(text).toContain("00");
    });

    it("controlType은 'text'이다", () => {
      expect(textfieldTypeHandlers.number.controlType).toBe("text");
    });

    it("validate — min 위반", () => {
      const errors = textfieldTypeHandlers.number.validate(5, { min: 10 });
      expect(errors).toContain("10보다 크거나 같아야 합니다.");
    });

    it("validate — max 위반", () => {
      const errors = textfieldTypeHandlers.number.validate(200, { max: 100 });
      expect(errors).toContain("100보다 작거나 같아야 합니다.");
    });

    it("validate — 숫자가 아닌 값", () => {
      const errors = textfieldTypeHandlers.number.validate("abc" as unknown, {});
      expect(errors).toContain("숫자를 입력하세요");
    });
  });

  describe("format type handler", () => {
    it("parse는 마스크 문자를 제거한다", () => {
      expect(textfieldTypeHandlers.format.parse("010-1234", { format: "XXX-XXXX" })).toBe(
        "0101234",
      );
    });

    it("toControlValue는 마스크를 적용한다", () => {
      expect(
        textfieldTypeHandlers.format.toControlValue("0101234", { format: "XXX-XXXX" }),
      ).toBe("010-1234");
    });

    it("toControlValue는 다중 포맷에서 길이가 맞는 패턴을 적용한다", () => {
      expect(
        textfieldTypeHandlers.format.toControlValue("0101234567", {
          format: "XXX-XXXX|XX-XXXX-XXXX",
        }),
      ).toBe("01-0123-4567");
    });

    it("validate — 길이 불일치", () => {
      const errors = textfieldTypeHandlers.format.validate("012", { format: "XXX-XXXX" });
      expect(errors).toContain("문자의 길이가 요구되는 길이와 다릅니다.");
    });

    it("parse — 포맷에 ] 포함 시 올바르게 파싱된다", () => {
      expect(textfieldTypeHandlers.format.parse("12]34", { format: "XX]XX" })).toBe("1234");
    });

    it("parse — 포맷에 ^ 포함 시 올바르게 파싱된다", () => {
      expect(textfieldTypeHandlers.format.parse("12^34", { format: "XX^XX" })).toBe("1234");
    });

    it("parse — 포맷에 \\ 포함 시 올바르게 파싱된다", () => {
      expect(textfieldTypeHandlers.format.parse("12\\34", { format: "XX\\XX" })).toBe("1234");
    });

    it("parse — 포맷에 일반 문자 포함 시 regex shorthand로 해석되지 않는다", () => {
      // "d"가 \\d(숫자 전체)로 해석되면 숫자까지 제거되어 빈 문자열이 됨
      expect(textfieldTypeHandlers.format.parse("12d34", { format: "XXdXX" })).toBe("1234");
    });
  });

  describe("datetime type validation", () => {
    it("DateTime 값이 min보다 작으면 에러를 반환한다", () => {
      const min = new DateTime(2024, 1, 15, 10, 0);
      const value = new DateTime(2024, 1, 14, 9, 0);
      const errors = textfieldTypeHandlers.datetime.validate(value, { min });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("DateTime 값이 max보다 크면 에러를 반환한다", () => {
      const max = new DateTime(2024, 12, 31, 23, 59);
      const value = new DateTime(2025, 1, 1, 0, 0);
      const errors = textfieldTypeHandlers.datetime.validate(value, { max });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("DateTime 값이 min~max 범위 내이면 에러가 없다", () => {
      const min = new DateTime(2024, 1, 1, 0, 0);
      const max = new DateTime(2024, 12, 31, 23, 59);
      const value = new DateTime(2024, 6, 15, 12, 0);
      const errors = textfieldTypeHandlers.datetime.validate(value, { min, max });
      expect(errors).toHaveLength(0);
    });
  });

  describe("time type validation", () => {
    it("Time 값이 min보다 작으면 에러를 반환한다", () => {
      const min = new Time(9, 0);
      const value = new Time(8, 30);
      const errors = textfieldTypeHandlers.time.validate(value, { min });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("Time 값이 max보다 크면 에러를 반환한다", () => {
      const max = new Time(18, 0);
      const value = new Time(18, 30);
      const errors = textfieldTypeHandlers.time.validate(value, { max });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("Time 값이 min~max 범위 내이면 에러가 없다", () => {
      const min = new Time(9, 0);
      const max = new Time(18, 0);
      const value = new Time(12, 0);
      const errors = textfieldTypeHandlers.time.validate(value, { min, max });
      expect(errors).toHaveLength(0);
    });
  });

  describe("string type validation 확장 (CONSIST-004)", () => {
    it("email 타입에 minlength 위반 시 에러를 반환한다", () => {
      const errors = textfieldTypeHandlers.email.validate("abc", { minlength: 5 });
      expect(errors).toContain("문자의 길이가 5보다 길거나 같아야 합니다.");
    });

    it("password 타입에 maxlength 위반 시 에러를 반환한다", () => {
      const errors = textfieldTypeHandlers.password.validate("a".repeat(25), { maxlength: 20 });
      expect(errors).toContain("문자의 길이가 20보다 짧거나 같아야 합니다.");
    });

    it("email 타입에 pattern 불일치 시 에러를 반환한다", () => {
      const errors = textfieldTypeHandlers.email.validate("user@other.com", {
        pattern: "^[a-z]+@example\\.com$",
      });
      expect(errors).toContain("입력 값이 형식에 맞지 않습니다.");
    });

    it("color 타입은 minlength/maxlength/pattern 검증을 수행하지 않는다", () => {
      const errors = textfieldTypeHandlers.color.validate("#aabbcc", { minlength: 10 });
      expect(errors).toHaveLength(0);
    });
  });
});

// endregion

// region Acceptance Tests: Slice 1 — String types + visual variants

describe("Feature 2.4 Slice 1: sd-textfield string types", () => {
  it("text 타입에 문자열 입력 시 value가 해당 문자열이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTextTest] })
      .createComponent(SdTextfieldTextTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = "hello";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe("hello");
  });

  it("password 타입은 display div에 ****를 표시한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldPasswordTest] })
      .createComponent(SdTextfieldPasswordTest);
    fixture.componentInstance.value.set("secret");
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    const contents = host.querySelector("._contents") as HTMLElement;
    expect(contents.textContent).toContain("****");
  });

  it("email 타입에 이메일 입력 시 value가 해당 문자열이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldEmailTest] })
      .createComponent(SdTextfieldEmailTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    input.value = "user@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe("user@example.com");
  });

  it("빈 문자열 입력 시 value가 undefined이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTextTest] })
      .createComponent(SdTextfieldTextTest);
    fixture.componentInstance.value.set("existing");
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it("붙여넣기 시 앞뒤 공백이 제거된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTextTest] })
      .createComponent(SdTextfieldTextTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    const pasteEvent = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData("text/plain", "  hello  ");
    input.dispatchEvent(pasteEvent);
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe("hello");
  });

  it("붙여넣기 시 브라우저 기본 paste가 차단된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTextTest] })
      .createComponent(SdTextfieldTextTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    const pasteEvent = new ClipboardEvent("paste", {
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData("text/plain", "hello");
    input.dispatchEvent(pasteEvent);

    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.value()).toBe("hello");
  });

  it("파싱 실패 텍스트 붙여넣기 시 기존 값이 유지되고 기본 paste가 차단된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.componentInstance.value.set(456);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    const pasteEvent = new ClipboardEvent("paste", {
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData("text/plain", "abc");
    input.dispatchEvent(pasteEvent);
    fixture.detectChanges();

    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.value()).toBe(456);
    expect(input.value).toBe("456");
  });

  it("빈 텍스트 붙여넣기 시 모델이 undefined가 되고 기본 paste가 차단된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTextTest] })
      .createComponent(SdTextfieldTextTest);
    fixture.componentInstance.value.set("existing");
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    const pasteEvent = new ClipboardEvent("paste", {
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData("text/plain", "   ");
    input.dispatchEvent(pasteEvent);
    fixture.detectChanges();

    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it("기본 상태에서 host의 data-sd-type이 컨트롤 타입이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTextTest] })
      .createComponent(SdTextfieldTextTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-type")).toBe("text");
    expect(host.getAttribute("data-sd-disabled")).toBe("false");
    expect(host.getAttribute("data-sd-readonly")).toBe("false");
  });

  it("disabled=true이면 input이 렌더링되지 않고 display div가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDisabledTest] })
      .createComponent(SdTextfieldDisabledTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-disabled")).toBe("true");
    expect(host.querySelector("input:not(.sd-invalid-input)")).toBeNull();

    const contents = host.querySelector("._contents") as HTMLElement;
    expect(contents).toBeTruthy();
  });

  it("readonly=true이면 input이 렌더링되지 않고 display div가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldReadonlyTest] })
      .createComponent(SdTextfieldReadonlyTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-readonly")).toBe("true");
    expect(host.querySelector("input:not(.sd-invalid-input)")).toBeNull();
  });

  it("inline=true이면 host에 data-sd-inline=true가 적용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldInlineTest] })
      .createComponent(SdTextfieldInlineTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-inline")).toBe("true");
  });

  it("placeholder가 설정되면 display div에 placeholder 텍스트가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldPlaceholderTest] })
      .createComponent(SdTextfieldPlaceholderTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    const contents = host.querySelector("._contents") as HTMLElement;
    expect(contents.textContent).toContain("입력하세요");
  });

  it("title이 설정되면 input과 display div에 title 속성이 적용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTitleTest] })
      .createComponent(SdTextfieldTitleTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    const input = host.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    const contents = host.querySelector("._contents") as HTMLElement;
    expect(input.getAttribute("title")).toBe("필드 설명");
    expect(contents.getAttribute("title")).toBe("필드 설명");
  });

  it("title 미지정 시 placeholder가 title로 사용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTitleFallbackTest] })
      .createComponent(SdTextfieldTitleFallbackTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    const input = host.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    expect(input.getAttribute("title")).toBe("입력하세요");
  });
});

// endregion

// region Acceptance Tests: Slice 2 — Number + Format types

describe("Feature 2.4 Slice 2: sd-textfield number + format types", () => {
  it("number 타입에 숫자 입력 시 value가 number이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    input.value = "1234";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(1234);
  });

  it("number 타입의 HTML input type은 text이고 inputmode는 numeric이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.getAttribute("inputmode")).toBe("numeric");

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-type")).toBe("text");
  });

  it("number 타입의 value가 있으면 콤마 포매팅된 값이 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.componentInstance.value.set(1234);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    expect(input.value).toBe("1,234");
  });

  it("useNumberComma=false이면 콤마 없이 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberNoCommaTest] })
      .createComponent(SdTextfieldNumberNoCommaTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    expect(input.value).toBe("1234");
  });

  it("format 타입에 마스크 문자 제거 후 저장된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldFormatTest] })
      .createComponent(SdTextfieldFormatTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    input.value = "010-1234";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe("0101234");
  });

  it("format 타입 value가 있으면 마스크 적용된 값이 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldFormatTest] })
      .createComponent(SdTextfieldFormatTest);
    fixture.componentInstance.value.set("0101234");
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    expect(input.value).toBe("010-1234");
  });
});

// endregion

// region Unit Tests: DateOnly + DateTime + Time handlers

describe("textfieldTypeHandlers date/datetime/time unit tests", () => {
  describe("DateOnly type handlers", () => {
    it("date controlType은 'date'이다", () => {
      expect(textfieldTypeHandlers.date.controlType).toBe("date");
    });

    it("month controlType은 'month'이다", () => {
      expect(textfieldTypeHandlers.month.controlType).toBe("month");
    });

    it("year controlType은 'text'이다", () => {
      expect(textfieldTypeHandlers.year.controlType).toBe("text");
    });

    it("date toControlValue는 yyyy-MM-dd 형식이다", () => {
      const d = new DateOnly(2025, 3, 15);
      expect(textfieldTypeHandlers.date.toControlValue(d, {})).toBe("2025-03-15");
    });

    it("month toControlValue는 yyyy-MM 형식이다", () => {
      const d = new DateOnly(2025, 3, 15);
      expect(textfieldTypeHandlers.month.toControlValue(d, {})).toBe("2025-03");
    });

    it("year toControlValue는 yyyy 형식이다", () => {
      const d = new DateOnly(2025, 3, 15);
      expect(textfieldTypeHandlers.year.toControlValue(d, {})).toBe("2025");
    });

    it("date validate — min tick 위반 시 에러", () => {
      const value = new DateOnly(2025, 1, 1);
      const min = new DateOnly(2025, 6, 1);
      const errors = textfieldTypeHandlers.date.validate(value, { min });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("date validate — max tick 위반 시 에러", () => {
      const value = new DateOnly(2025, 12, 31);
      const max = new DateOnly(2025, 6, 1);
      const errors = textfieldTypeHandlers.date.validate(value, { max });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("date validate — min/max 범위 내 에러 없음", () => {
      const value = new DateOnly(2025, 6, 15);
      const min = new DateOnly(2025, 1, 1);
      const max = new DateOnly(2025, 12, 31);
      const errors = textfieldTypeHandlers.date.validate(value, { min, max });
      expect(errors).toHaveLength(0);
    });

    it("date validate — DateOnly가 아닌 값은 에러", () => {
      const errors = textfieldTypeHandlers.date.validate("not-a-date" as unknown, {});
      expect(errors).toContain("날짜를 입력하세요");
    });

    it("date validate — required=true, 값 없음 → 에러", () => {
      const errors = textfieldTypeHandlers.date.validate(undefined, { required: true });
      expect(errors).toContain("값을 입력하세요.");
    });

    it("date parse — 유효한 문자열은 DateOnly를 반환한다", () => {
      const result = textfieldTypeHandlers.date.parse("2025-03-15", {});
      expect(result).toBeInstanceOf(DateOnly);
    });

    it("date parse — 유효하지 않은 문자열은 undefined를 반환한다", () => {
      const result = textfieldTypeHandlers.date.parse("invalid", {});
      expect(result).toBeUndefined();
    });
  });

  describe("DateTime type handlers", () => {
    it("datetime controlType은 'datetime-local'이다", () => {
      expect(textfieldTypeHandlers.datetime.controlType).toBe("datetime-local");
    });

    it("datetime-sec controlType은 'datetime-local'이다", () => {
      expect(textfieldTypeHandlers["datetime-sec"].controlType).toBe("datetime-local");
    });

    it("datetime getControlStep은 'any'이다", () => {
      expect(textfieldTypeHandlers.datetime.getControlStep(undefined)).toBe("any");
    });

    it("datetime-sec getControlStep은 1이다", () => {
      expect(textfieldTypeHandlers["datetime-sec"].getControlStep(undefined)).toBe(1);
    });

    it("datetime toControlValue는 yyyy-MM-ddTHH:mm 형식이다", () => {
      const dt = new DateTime(2025, 3, 15, 10, 30, 0);
      expect(textfieldTypeHandlers.datetime.toControlValue(dt, {})).toBe("2025-03-15T10:30");
    });

    it("datetime-sec toControlValue는 yyyy-MM-ddTHH:mm:ss 형식이다", () => {
      const dt = new DateTime(2025, 3, 15, 10, 30, 45);
      expect(textfieldTypeHandlers["datetime-sec"].toControlValue(dt, {})).toBe(
        "2025-03-15T10:30:45",
      );
    });

    it("datetime toDisplayText는 표시용 포맷을 반환한다", () => {
      const dt = new DateTime(2025, 3, 15, 10, 30, 0);
      const text = textfieldTypeHandlers.datetime.toDisplayText(dt, {});
      expect(text).toBeDefined();
      expect(text).toContain("2025-03-15");
    });

    it("datetime validate — DateTime이 아닌 값은 에러", () => {
      const errors = textfieldTypeHandlers.datetime.validate("not-a-datetime" as unknown, {});
      expect(errors).toContain("날짜 및 시간을 입력하세요");
    });

    it("datetime validate — required=true, 값 없음 → 에러", () => {
      const errors = textfieldTypeHandlers.datetime.validate(undefined, { required: true });
      expect(errors).toContain("값을 입력하세요.");
    });

    it("datetime validate — 유효한 DateTime은 에러 없음", () => {
      const dt = new DateTime(2025, 3, 15, 10, 30, 0);
      const errors = textfieldTypeHandlers.datetime.validate(dt, {});
      expect(errors).toHaveLength(0);
    });

    it("datetime parse — 유효하지 않은 문자열은 undefined를 반환한다", () => {
      const result = textfieldTypeHandlers.datetime.parse("invalid", {});
      expect(result).toBeUndefined();
    });
  });

  describe("Time 타입 핸들러", () => {
    it("time controlType은 'time'이다", () => {
      expect(textfieldTypeHandlers.time.controlType).toBe("time");
    });

    it("time-sec controlType은 'time'이다", () => {
      expect(textfieldTypeHandlers["time-sec"].controlType).toBe("time");
    });

    it("time getControlStep은 'any'이다", () => {
      expect(textfieldTypeHandlers.time.getControlStep(undefined)).toBe("any");
    });

    it("time-sec getControlStep은 1이다", () => {
      expect(textfieldTypeHandlers["time-sec"].getControlStep(undefined)).toBe(1);
    });

    it("time toControlValue는 HH:mm 형식이다", () => {
      const t = new Time(14, 30, 0);
      expect(textfieldTypeHandlers.time.toControlValue(t, {})).toBe("14:30");
    });

    it("time-sec toControlValue는 HH:mm:ss 형식이다", () => {
      const t = new Time(14, 30, 45);
      expect(textfieldTypeHandlers["time-sec"].toControlValue(t, {})).toBe("14:30:45");
    });

    it("time toDisplayText는 표시용 포맷을 반환한다", () => {
      const t = new Time(14, 30, 0);
      const text = textfieldTypeHandlers.time.toDisplayText(t, {});
      expect(text).toBeDefined();
    });

    it("time validate — Time이 아닌 값은 에러", () => {
      const errors = textfieldTypeHandlers.time.validate("not-a-time" as unknown, {});
      expect(errors).toContain("시간을 입력하세요");
    });

    it("time validate — required=true, 값 없음 → 에러", () => {
      const errors = textfieldTypeHandlers.time.validate(undefined, { required: true });
      expect(errors).toContain("값을 입력하세요.");
    });

    it("time validate — 유효한 Time은 에러 없음", () => {
      const t = new Time(14, 30, 0);
      const errors = textfieldTypeHandlers.time.validate(t, {});
      expect(errors).toHaveLength(0);
    });

    it("time parse — 유효하지 않은 문자열은 undefined를 반환한다", () => {
      const result = textfieldTypeHandlers.time.parse("invalid", {});
      expect(result).toBeUndefined();
    });
  });
});

// endregion

// region Acceptance Tests: Slice 3 — DateOnly + DateTime + Time types

describe("Feature 2.4 Slice 3: sd-textfield date/datetime/time types", () => {
  it("date 타입에 value 설정 시 input value가 yyyy-MM-dd 형식이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDateTest] })
      .createComponent(SdTextfieldDateTest);
    fixture.componentInstance.value.set(new DateOnly(2025, 3, 15));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.value).toBe("2025-03-15");
  });

  it("date 타입의 host data-sd-type은 'date'이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDateTest] })
      .createComponent(SdTextfieldDateTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-type")).toBe("date");
  });

  it("month 타입에 value 설정 시 input value가 yyyy-MM 형식이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldMonthTest] })
      .createComponent(SdTextfieldMonthTest);
    fixture.componentInstance.value.set(new DateOnly(2025, 3, 15));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.value).toBe("2025-03");
  });

  it("month 타입의 host data-sd-type은 'month'이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldMonthTest] })
      .createComponent(SdTextfieldMonthTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-type")).toBe("month");
  });

  it("year 타입에 value 설정 시 input value가 yyyy 형식이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldYearTest] })
      .createComponent(SdTextfieldYearTest);
    fixture.componentInstance.value.set(new DateOnly(2025, 3, 15));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.value).toBe("2025");
  });

  it("year 타입의 host data-sd-type은 'text'이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldYearTest] })
      .createComponent(SdTextfieldYearTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-type")).toBe("text");
  });

  it("datetime 타입에 value 설정 시 input value가 yyyy-MM-ddTHH:mm 형식이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDatetimeTest] })
      .createComponent(SdTextfieldDatetimeTest);
    fixture.componentInstance.value.set(new DateTime(2025, 3, 15, 10, 30, 0));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.value).toBe("2025-03-15T10:30");
  });

  it("datetime 타입의 host data-sd-type은 'datetime-local'이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDatetimeTest] })
      .createComponent(SdTextfieldDatetimeTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-type")).toBe("datetime-local");
  });

  it("datetime-sec 타입의 input step 속성은 1이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDatetimeSecTest] })
      .createComponent(SdTextfieldDatetimeSecTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.getAttribute("step")).toBe("1");
  });

  it("datetime-sec 타입에 value 설정 시 input value에 초가 포함된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDatetimeSecTest] })
      .createComponent(SdTextfieldDatetimeSecTest);
    fixture.componentInstance.value.set(new DateTime(2025, 3, 15, 10, 30, 45));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.value).toBe("2025-03-15T10:30:45");
  });

  it("time 타입에 value 설정 시 input value가 HH:mm 형식이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTimeTest] })
      .createComponent(SdTextfieldTimeTest);
    fixture.componentInstance.value.set(new Time(14, 30, 0));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.value).toBe("14:30");
  });

  it("time 타입의 host data-sd-type은 'time'이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTimeTest] })
      .createComponent(SdTextfieldTimeTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-type")).toBe("time");
  });

  it("time-sec 타입의 input step 속성은 1이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTimeSecTest] })
      .createComponent(SdTextfieldTimeSecTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.getAttribute("step")).toBe("1");
  });

  it("time-sec 타입에 value 설정 시 input value에 초가 포함된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldTimeSecTest] })
      .createComponent(SdTextfieldTimeSecTest);
    fixture.componentInstance.value.set(new Time(14, 30, 45));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      "input:not(.sd-invalid-input)",
    ) as HTMLInputElement;
    expect(input.value).toBe("14:30:45");
  });

  it("datetime readonly에서 display div에 표시용 텍스트가 나타난다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldDatetimeReadonlyTest] })
      .createComponent(SdTextfieldDatetimeReadonlyTest);
    fixture.componentInstance.value.set(new DateTime(2025, 3, 15, 10, 30, 0));
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textfield") as HTMLElement;
    expect(host.getAttribute("data-sd-readonly")).toBe("true");
    expect(host.querySelector("input:not(.sd-invalid-input)")).toBeNull();

    const contents = host.querySelector("._contents") as HTMLElement;
    expect(contents).toBeTruthy();
    expect(contents.textContent).toContain("2025-03-15");
  });
});

// endregion

// region FIX-2 Slice 1: number 중간 입력 및 paste 복원

describe("FIX-2 Slice 1: number handler 중간 입력 수정 (LOGIC-008)", () => {
  it("parse('0.0')은 0을 반환한다 (중간 입력이 소실되지 않음)", () => {
    expect(textfieldTypeHandlers.number.parse("0.0", {})).toBe(0);
  });

  it("parse('0.00')은 0을 반환한다", () => {
    expect(textfieldTypeHandlers.number.parse("0.00", {})).toBe(0);
  });

  it("parse('0.')은 undefined를 반환한다 (trailing dot은 중간 상태)", () => {
    expect(textfieldTypeHandlers.number.parse("0.", {})).toBeUndefined();
  });

  it("parse('1.50')은 1.5를 반환한다", () => {
    expect(textfieldTypeHandlers.number.parse("1.50", {})).toBe(1.5);
  });

  it("parse('-0.0')은 -0을 반환한다", () => {
    expect(textfieldTypeHandlers.number.parse("-0.0", {})).toBe(-0);
  });
});

describe("FIX-2 Slice 1: textfield number 입력 통합 (LOGIC-008)", () => {
  it('"0.0" 입력 시 value가 0으로 설정된다', () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    input.value = "0.0";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(0);
  });

  it('"1.50" 입력 시 value가 1.5로 설정된다', () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    input.value = "1.50";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(1.5);
  });
});

describe("FIX-2 Slice 1: textfield paste 실패 복원 (LOGIC-010)", () => {
  it('숫자 타입에 "abc" paste 시 value가 유지되고 input이 복원된다', () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.componentInstance.value.set(42);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    const pasteEvent = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData("text/plain", "abc");
    input.dispatchEvent(pasteEvent);
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(42);
    expect(input.value).toBe("42");
  });

  it("빈 문자열 paste 시 value가 undefined로 설정된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextfieldNumberTest] })
      .createComponent(SdTextfieldNumberTest);
    fixture.componentInstance.value.set(42);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector("input:not(.sd-invalid-input)") as HTMLInputElement;
    const pasteEvent = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData("text/plain", "   ");
    input.dispatchEvent(pasteEvent);
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });
});

// endregion
