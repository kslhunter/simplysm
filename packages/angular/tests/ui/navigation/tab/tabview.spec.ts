import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTabviewBasicTest,
  SdTabviewHeaderTest,
  SdTabviewExternalValueTest,
} from "./sd-tabview-test.fixture";

describe("Feature 4.2 Slice 2: sd-tabview / sd-tabview-item", () => {
  it("Scenario: 선택된 탭뷰 아이템만 표시 - value='A'이면 A 컨텐츠만 표시되고 B는 숨겨진다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabviewBasicTest] })
      .createComponent(SdTabviewBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll(
      "sd-tabview-item",
    ) as NodeListOf<HTMLElement>;
    expect(items.length).toBe(2);

    // A가 선택됨
    expect(items[0].getAttribute("data-sd-selected")).toBe("true");
    expect(items[1].getAttribute("data-sd-selected")).not.toBe("true");
  });

  it("Scenario: header가 지정된 탭뷰 아이템의 탭 헤더 - header='설정'이면 탭 헤더에 '설정'이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabviewHeaderTest] })
      .createComponent(SdTabviewHeaderTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const tabItems = fixture.nativeElement.querySelectorAll(
      "sd-tab-item",
    ) as NodeListOf<HTMLElement>;
    expect(tabItems.length).toBe(2);

    // 첫 번째 탭: header가 '설정'으로 지정
    expect(tabItems[0].textContent.trim()).toBe("설정");
  });

  it("Scenario: header가 미지정된 탭뷰 아이템의 탭 헤더 - header 미지정이면 value가 탭 헤더에 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabviewHeaderTest] })
      .createComponent(SdTabviewHeaderTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const tabItems = fixture.nativeElement.querySelectorAll(
      "sd-tab-item",
    ) as NodeListOf<HTMLElement>;

    // 두 번째 탭: header 미지정, value='profile' 사용
    expect(tabItems[1].textContent.trim()).toBe("profile");
  });

  it("Scenario: 외부에서 value 설정 - value를 'B'로 변경하면 B 컨텐츠가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabviewExternalValueTest] })
      .createComponent(SdTabviewExternalValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // 초기 상태: A 선택
    const items = fixture.nativeElement.querySelectorAll(
      "sd-tabview-item",
    ) as NodeListOf<HTMLElement>;
    expect(items[0].getAttribute("data-sd-selected")).toBe("true");

    // 외부에서 value를 B로 변경
    fixture.componentInstance.value.set("B");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(items[0].getAttribute("data-sd-selected")).not.toBe("true");
    expect(items[1].getAttribute("data-sd-selected")).toBe("true");
  });

  it("Scenario: 탭 클릭으로 외부 바인딩 갱신 - 'B' 탭 클릭시 외부 signal이 'B'로 갱신된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabviewExternalValueTest] })
      .createComponent(SdTabviewExternalValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // B 탭 헤더를 클릭
    const tabItems = fixture.nativeElement.querySelectorAll(
      "sd-tab-item",
    ) as NodeListOf<HTMLElement>;
    tabItems[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    // 외부 signal 갱신 확인
    expect(fixture.componentInstance.value()).toBe("B");

    // B 컨텐츠가 표시됨
    const viewItems = fixture.nativeElement.querySelectorAll(
      "sd-tabview-item",
    ) as NodeListOf<HTMLElement>;
    expect(viewItems[1].getAttribute("data-sd-selected")).toBe("true");
  });
});
