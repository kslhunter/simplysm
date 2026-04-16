import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { DateOnly } from "@simplysm/core-common";
import {
  SdDateRangePickerDefaultTest,
  SdDateRangePickerRequiredTest,
} from "./sd-date-range-picker-test.fixture";
import { SdDateRangePicker } from "../../../src/controls/input/sd-date-range-picker";
import "@simplysm/core-browser";

// region Helper

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
  });
}

function getPickerControl(fixture: any): SdDateRangePicker {
  const el = fixture.nativeElement.querySelector("sd-date-range-picker");
  return fixture.debugElement.query(
    (de: any) => de.nativeElement === el,
  ).componentInstance as SdDateRangePicker;
}

// endregion

// region Unit Tests: handleDatePeriodTypeChanged logic

describe("SdDateRangePicker.handleDatePeriodTypeChanged unit tests", () => {
  it("'월'로 전환 시 from이 있으면 from=1일, to=말일로 설정된다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2024, 3, 15));
    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.from()).toEqual(new DateOnly(2024, 3, 1));
    expect(ctrl.to()).toEqual(new DateOnly(2024, 3, 31));
  });

  it("'월'로 전환 시 from이 undefined면 to도 undefined이다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.from()).toBeUndefined();
    expect(ctrl.to()).toBeUndefined();
  });

  it("'일'로 전환 시 to가 from과 동일해진다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2024, 3, 1));
    ctrl.to.set(new DateOnly(2024, 3, 31));
    ctrl.periodType.set("일");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.to()).toEqual(new DateOnly(2024, 3, 1));
  });

  it("'월'로 전환 시 from이 월말(31일)이면 정규화된 1일 기준으로 to를 계산한다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2024, 1, 31));
    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.from()).toEqual(new DateOnly(2024, 1, 1));
    expect(ctrl.to()).toEqual(new DateOnly(2024, 1, 31));
  });

  it("'월' 모드에서 비정규화된 from 변경 시 from이 1일로 정규화되고 to가 월말이 된다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("월");
    // 프로그래밍 방식으로 비정규화된 날짜 설정
    ctrl.from.set(new DateOnly(2025, 3, 15));
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.from()).toEqual(new DateOnly(2025, 3, 1));
    expect(ctrl.to()).toEqual(new DateOnly(2025, 3, 31));
  });

  it("비윤년 2월 '월' 전환 시 to가 2월 28일이다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2025, 2, 10));
    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.from()).toEqual(new DateOnly(2025, 2, 1));
    expect(ctrl.to()).toEqual(new DateOnly(2025, 2, 28));
  });

  it("윤년 2월 말일을 올바르게 계산한다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2024, 2, 15));
    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.from()).toEqual(new DateOnly(2024, 2, 1));
    expect(ctrl.to()).toEqual(new DateOnly(2024, 2, 29));
  });
});

// endregion

// region Unit Tests: handleFromDateChanged logic

describe("SdDateRangePicker.handleFromDateChanged unit tests", () => {
  it("'범위' 모드에서 from > to이면 to가 from으로 조정된다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("범위");
    ctrl.from.set(new DateOnly(2024, 1, 1));
    ctrl.to.set(new DateOnly(2024, 1, 31));
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.from.set(new DateOnly(2024, 2, 15));
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.to()).toEqual(new DateOnly(2024, 2, 15));
  });

  it("'일' 모드에서 from 변경 시 to=from이 된다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("일");
    ctrl.from.set(new DateOnly(2024, 5, 15));
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.to()).toEqual(new DateOnly(2024, 5, 15));
  });

  it("'월' 모드에서 from 변경 시 to=말일이 된다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("월");
    ctrl.from.set(new DateOnly(2024, 2, 1));
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.to()).toEqual(new DateOnly(2024, 2, 29));
  });

  it("'월' 모드에서 from이 undefined이면 to도 undefined이다", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("월");
    ctrl.from.set(undefined);
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(ctrl.to()).toBeUndefined();
  });
});

// endregion

// region Acceptance Tests: DateRangePicker Scenarios

describe("Feature 5.2 Slice 2: SdDateRangePicker", () => {
  it("Scenario: '범위' 모드에서 from/to 독립 입력", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // 기본값은 "범위"
    expect(fixture.componentInstance.periodType()).toBe("범위");

    // sd-range가 type="date"로 표시된다
    const host = fixture.nativeElement.querySelector("sd-date-range-picker") as HTMLElement;
    const range = host.querySelector("sd-range");
    expect(range).toBeTruthy();

    // from/to를 직접 설정하여 테스트
    fixture.componentInstance.from.set(new DateOnly(2024, 3, 1));
    fixture.componentInstance.to.set(new DateOnly(2024, 3, 31));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toEqual(new DateOnly(2024, 3, 1));
    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 3, 31));
  });

  it("Scenario: '일' 모드에서 날짜 선택 시 to=from", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("일");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    // sd-textfield with type="date"가 표시된다
    const host = fixture.nativeElement.querySelector("sd-date-range-picker") as HTMLElement;
    const textfield = host.querySelector("sd-textfield") as HTMLElement;
    expect(textfield).toBeTruthy();

    // from을 설정하면 to=from
    ctrl.from.set(new DateOnly(2024, 5, 15));
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 5, 15));
  });

  it("Scenario: '월' 모드에서 월 선택 시 from=1일, to=말일", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    // sd-textfield with type="month"가 표시된다
    const host = fixture.nativeElement.querySelector("sd-date-range-picker") as HTMLElement;
    const textfield = host.querySelector("sd-textfield") as HTMLElement;
    expect(textfield).toBeTruthy();

    // from에 2024-02를 입력
    ctrl.from.set(new DateOnly(2024, 2, 1));
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toEqual(new DateOnly(2024, 2, 1));
    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 2, 29));
  });

  it("Scenario: '범위'→'일' 전환 시 to=from 조정", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2024, 3, 1));
    ctrl.to.set(new DateOnly(2024, 3, 31));
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.periodType.set("일");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 3, 1));
  });

  it("Scenario: '범위'→'월' 전환 시 from=1일, to=말일 조정", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2024, 3, 15));
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toEqual(new DateOnly(2024, 3, 1));
    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 3, 31));
  });

  it("Scenario: '일'→'범위' 전환 시 날짜 유지", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("일");
    ctrl.from.set(new DateOnly(2024, 5, 15));
    ctrl.to.set(new DateOnly(2024, 5, 15));
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.periodType.set("범위");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toEqual(new DateOnly(2024, 5, 15));
    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 5, 15));
  });

  it("Scenario: '월'→'범위' 전환 시 날짜 유지", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.periodType.set("월");
    ctrl.from.set(new DateOnly(2024, 2, 1));
    ctrl.to.set(new DateOnly(2024, 2, 29));
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.periodType.set("범위");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toEqual(new DateOnly(2024, 2, 1));
    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 2, 29));
  });

  it("Scenario: '범위' 모드에서 from > to이면 to 자동 조정", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    ctrl.from.set(new DateOnly(2024, 1, 1));
    ctrl.to.set(new DateOnly(2024, 1, 31));
    fixture.detectChanges();
    TestBed.flushEffects();

    ctrl.from.set(new DateOnly(2024, 2, 15));
    ctrl.handleFromDateChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 2, 15));
  });

  it("Scenario: from이 undefined인 상태에서 '월' 전환", () => {
    setupTestBed(SdDateRangePickerDefaultTest);
    const fixture = TestBed.createComponent(SdDateRangePickerDefaultTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const ctrl = getPickerControl(fixture);
    // from이 undefined인 상태에서 "월"로 전환
    ctrl.periodType.set("월");
    ctrl.handleDatePeriodTypeChanged();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toBeUndefined();
    expect(fixture.componentInstance.to()).toBeUndefined();
  });

  it("Scenario: required이면 날짜 입력 필수", () => {
    setupTestBed(SdDateRangePickerRequiredTest);
    const fixture = TestBed.createComponent(SdDateRangePickerRequiredTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // "범위" 모드에서 sd-range 내의 두 textfield가 required
    const host = fixture.nativeElement.querySelector("sd-date-range-picker") as HTMLElement;
    const invalidInputs = host.querySelectorAll(
      "sd-range input.sd-invalid-input",
    );
    expect(invalidInputs.length).toBe(2);
    expect((invalidInputs[0] as HTMLInputElement).checkValidity()).toBe(false);
    expect((invalidInputs[1] as HTMLInputElement).checkValidity()).toBe(false);
  });
});

// endregion
