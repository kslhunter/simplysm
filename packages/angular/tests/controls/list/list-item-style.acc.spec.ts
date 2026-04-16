import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdListItemSelectedIconTest,
  SdListItemUnselectedIconTest,
  SdListItemNoChildrenTest,
  SdListItemFlatTest,
  SdListItemFlatNoChildrenTest,
  SdListItemAccordionTest,
  SdListItemAccordionOpenTest,
} from "./sd-list-test.fixture";

describe("Feature 2.1 Slice 1: selected-icon 호스트 속성 및 스타일 복원", () => {
  it("selectedIcon 설정 + selected=true이면 data-sd-has-selected-icon이 true이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemSelectedIconTest],
    }).createComponent(SdListItemSelectedIconTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-has-selected-icon")).toBe("true");
    expect(host.getAttribute("data-sd-selected")).toBe("true");
  });

  it("selectedIcon 설정 + selected=false이면 data-sd-has-selected-icon이 true이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemUnselectedIconTest],
    }).createComponent(SdListItemUnselectedIconTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-has-selected-icon")).toBe("true");
    expect(host.getAttribute("data-sd-selected")).toBe("false");
  });

  it("selectedIcon 미설정이면 data-sd-has-selected-icon이 false이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemNoChildrenTest],
    }).createComponent(SdListItemNoChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-has-selected-icon")).toBe("false");
  });
});

describe("Feature 2.1 Slice 2: collapse-icon 위치 및 data-sd-open 복원", () => {
  it("accordion 모드에서 collapse-icon은 _content 마지막 자식이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemAccordionTest],
    }).createComponent(SdListItemAccordionTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    const lastChild = content.lastElementChild;
    expect(lastChild?.tagName.toLowerCase()).toBe("sd-collapse-icon");
  });

  it("open=true일 때 data-sd-open 속성이 true이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemAccordionOpenTest],
    }).createComponent(SdListItemAccordionOpenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-open")).toBe("true");
  });

  it("open=false일 때 data-sd-open 속성이 false이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemAccordionTest],
    }).createComponent(SdListItemAccordionTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-open")).toBe("false");
  });
});

describe("Feature 2.1 Slice 2: flat scope 보정 전제조건", () => {
  it("flat + hasChildren=true이면 두 속성이 모두 정확하다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemFlatTest],
    }).createComponent(SdListItemFlatTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-layout")).toBe("flat");
    expect(host.getAttribute("data-sd-has-children")).toBe("true");
  });

  it("flat + hasChildren=false이면 data-sd-has-children이 false이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemFlatNoChildrenTest],
    }).createComponent(SdListItemFlatNoChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-layout")).toBe("flat");
    expect(host.getAttribute("data-sd-has-children")).toBe("false");
  });
});
