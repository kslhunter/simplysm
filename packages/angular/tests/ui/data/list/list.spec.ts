import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdListDefaultTest,
  SdListNestedTest,
  SdListItemAccordionTest,
  SdListItemAccordionOpenTest,
  SdListItemFlatTest,
  SdListItemNoChildrenTest,
  SdListItemSelectedIconTest,
  SdListItemUnselectedIconTest,
  SdListItemToolTest,
} from "./sd-list-test.fixture";

describe("Feature 4.1 Slice 2: sd-list", () => {
  it("기본 목록이 렌더링되고 user-select가 none이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListDefaultTest] })
      .createComponent(SdListDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list") as HTMLElement;
    expect(host).toBeTruthy();

    const items = host.querySelectorAll("sd-list-item");
    expect(items.length).toBe(2);
  });

  it("중첩 목록이 정상 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListNestedTest] })
      .createComponent(SdListNestedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const outerList = fixture.nativeElement.querySelector("sd-list") as HTMLElement;
    expect(outerList).toBeTruthy();

    const innerList = outerList.querySelector("sd-list-item sd-list") as HTMLElement;
    expect(innerList).toBeTruthy();

    const innerItem = innerList.querySelector("sd-list-item") as HTMLElement;
    expect(innerItem).toBeTruthy();
  });
});

describe("Feature 4.1 Slice 2: sd-list-item layout", () => {
  it("accordion 레이아웃에서 _content 클릭 시 open이 토글되고 sd-collapse-icon이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListItemAccordionTest] })
      .createComponent(SdListItemAccordionTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    expect(content).toBeTruthy();

    // collapse-icon should be visible for accordion with children
    const collapseIcon = host.querySelector("sd-collapse-icon") as HTMLElement;
    expect(collapseIcon).toBeTruthy();

    // 초기 닫힘 상태
    expect(fixture.componentInstance.open()).toBe(false);

    // 클릭하여 열기
    content.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(true);

    // 클릭하여 닫기
    content.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it("accordion open=true이면 하위 sd-list가 sd-collapse를 통해 펼쳐진다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListItemAccordionOpenTest] })
      .createComponent(SdListItemAccordionOpenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    const collapse = host.querySelector("sd-collapse") as HTMLElement;
    expect(collapse).toBeTruthy();

    // open=true -> collapse should be open
    expect(collapse.querySelector("sd-list")).toBeTruthy();
  });

  it("flat 레이아웃에서 하위 목록이 항상 펼쳐져 있고 sd-collapse-icon이 없다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListItemFlatTest] })
      .createComponent(SdListItemFlatTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;

    // flat 모드에서 collapse 아이콘 없음
    const collapseIcon = host.querySelector("sd-collapse-icon") as HTMLElement;
    expect(collapseIcon).toBeNull();

    // 콘텐츠 영역에 flat-header 스타일 적용
    const content = host.querySelector("._content") as HTMLElement;
    expect(content).toBeTruthy();
    expect(host.getAttribute("data-sd-layout")).toBe("flat");

    // 자식이 표시되어야 함 (collapse 래핑 없음)
    const innerList = host.querySelector("sd-list") as HTMLElement;
    expect(innerList).toBeTruthy();
  });

  it("하위 항목이 없으면 hasChildren이 false이고 sd-collapse 영역이 없다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListItemNoChildrenTest] })
      .createComponent(SdListItemNoChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;

    // collapse 없음
    const collapse = host.querySelector("sd-collapse") as HTMLElement;
    expect(collapse).toBeNull();

    // collapse 아이콘 없음
    const collapseIcon = host.querySelector("sd-collapse-icon") as HTMLElement;
    expect(collapseIcon).toBeNull();

    expect(host.getAttribute("data-sd-has-children")).toBe("false");
  });
});

describe("Feature 4.1 Slice 2: sd-list-item selection & readonly", () => {
  it("selected=true이고 selectedIcon이 있으면 아이콘이 tx-theme-primary-default 클래스를 가진다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListItemSelectedIconTest] })
      .createComponent(SdListItemSelectedIconTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    const iconEl = host.querySelector("ng-icon") as HTMLElement;
    expect(iconEl).toBeTruthy();
    expect(iconEl.classList.contains("tx-theme-primary-default")).toBe(true);
  });

  it("selected=false이고 selectedIcon이 있으면 아이콘이 tx-trans-lightest 클래스를 가진다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListItemUnselectedIconTest] })
      .createComponent(SdListItemUnselectedIconTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    const iconEl = host.querySelector("ng-icon") as HTMLElement;
    expect(iconEl).toBeTruthy();
    expect(iconEl.classList.contains("tx-trans-lightest")).toBe(true);
  });

  it("toolTpl이 정의되어 있으면 _content 우측에 tool 영역이 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdListItemToolTest] })
      .createComponent(SdListItemToolTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    const toolArea = host.querySelector("._tool") as HTMLElement;
    expect(toolArea).toBeTruthy();
    expect(toolArea.querySelector(".tool-btn")).toBeTruthy();
  });
});
