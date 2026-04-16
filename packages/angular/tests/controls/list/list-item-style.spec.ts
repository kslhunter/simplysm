import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdListItemDynamicIconTest } from "./sd-list-test.fixture";

describe("sd-list-item data-sd-has-selected-icon 동적 변경", () => {
  it("selectedIcon이 undefined에서 값으로 변경되면 속성이 true로 업데이트된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemDynamicIconTest],
    }).createComponent(SdListItemDynamicIconTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    expect(host.getAttribute("data-sd-has-selected-icon")).toBe("false");

    fixture.componentInstance.icon.set(fixture.componentInstance.iconValue);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.getAttribute("data-sd-has-selected-icon")).toBe("true");
  });
});
