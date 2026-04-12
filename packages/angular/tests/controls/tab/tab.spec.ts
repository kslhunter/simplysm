import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTabClickTest,
  SdTabReclickTest,
} from "./sd-tab-test.fixture";

describe("Feature 4.2 Slice 1: sd-tab / sd-tab-item", () => {
  it("Scenario: 탭 헤더 클릭으로 value 변경 - 'A' 탭을 클릭하면 value가 'A'로 설정된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabClickTest] })
      .createComponent(SdTabClickTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const tabItems = fixture.nativeElement.querySelectorAll("sd-tab-item") as NodeListOf<HTMLElement>;
    expect(tabItems.length).toBe(2);

    tabItems[0].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("A");
  });

  it("Scenario: 이미 선택된 탭 재클릭 - value가 'A'인 상태에서 'A'를 다시 클릭해도 'A'로 유지된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabReclickTest] })
      .createComponent(SdTabReclickTest);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("A");

    const tabItems = fixture.nativeElement.querySelectorAll("sd-tab-item") as NodeListOf<HTMLElement>;
    tabItems[0].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("A");
  });

  it("Scenario: 탭 헤더 바만 사용 - sd-tab과 sd-tab-item만으로 구성하여 value를 변경하고 읽을 수 있다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabClickTest] })
      .createComponent(SdTabClickTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const tabItems = fixture.nativeElement.querySelectorAll("sd-tab-item") as NodeListOf<HTMLElement>;

    // 클릭으로 value 변경
    tabItems[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("B");

    // 다른 탭 클릭으로 value 변경
    tabItems[0].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe("A");
  });
});
