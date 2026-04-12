import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TopbarUserBasicTest } from "./sd-topbar-user-test.fixture";

describe("SdTopbarUser unit", () => {
  it("menus input이 required이다 — 빈 배열도 에러 없이 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarUserBasicTest],
    }).createComponent(TopbarUserBasicTest);
    fixture.componentInstance.menus.set([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-topbar-user") as HTMLElement;
    expect(host).toBeTruthy();
  });
});
