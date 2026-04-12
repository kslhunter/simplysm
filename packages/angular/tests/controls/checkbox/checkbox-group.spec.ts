import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdCheckboxGroupDefaultTest,
  SdCheckboxGroupPreselectedTest,
  SdCheckboxGroupMultiTest,
  SdCheckboxGroupDisabledTest,
} from "./sd-checkbox-group-test.fixture";

describe("Feature 2.5 Slice 3: sd-checkbox-group", () => {
  it("그룹 아이템 선택 — 빈 배열에서 아이템 클릭 시 해당 값이 추가된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxGroupDefaultTest] })
      .createComponent(SdCheckboxGroupDefaultTest);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-checkbox") as NodeListOf<HTMLElement>;
    items[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toEqual(["A"]);
  });

  it("그룹 아이템 추가 선택 — 기존 선택에 새 값이 추가된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxGroupPreselectedTest] })
      .createComponent(SdCheckboxGroupPreselectedTest);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-checkbox") as NodeListOf<HTMLElement>;
    items[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toEqual(["A", "B"]);
  });

  it("그룹 아이템 선택 해제 — 선택된 아이템 클릭 시 해당 값이 제거된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxGroupMultiTest] })
      .createComponent(SdCheckboxGroupMultiTest);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-checkbox") as NodeListOf<HTMLElement>;
    items[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toEqual(["B"]);
  });

  it("그룹 disabled 전파 — disabled=true인 그룹의 아이템 클릭이 무시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxGroupDisabledTest] })
      .createComponent(SdCheckboxGroupDisabledTest);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-checkbox") as NodeListOf<HTMLElement>;
    items[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toEqual([]);
  });

  it("선택된 아이템의 체크박스는 checked 상태이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxGroupPreselectedTest] })
      .createComponent(SdCheckboxGroupPreselectedTest);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-checkbox") as NodeListOf<HTMLElement>;
    expect(items[0].getAttribute("data-sd-checked")).toBe("true");
    expect(items[1].getAttribute("data-sd-checked")).toBe("false");
  });

  it("disabled 그룹의 아이템 체크박스에 disabled가 전파된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCheckboxGroupDisabledTest] })
      .createComponent(SdCheckboxGroupDisabledTest);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-checkbox") as NodeListOf<HTMLElement>;
    expect(items[0].getAttribute("data-sd-disabled")).toBe("true");
  });
});
