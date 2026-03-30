import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdCardTestHost, SdCardAttrTestHost } from "./sd-card-test.fixture";

describe("SdCardDirective", () => {
  it("sd-card 요소에 .card CSS 클래스를 부여한다", () => {
    TestBed.configureTestingModule({ imports: [SdCardTestHost] });
    const fixture = TestBed.createComponent(SdCardTestHost);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector("sd-card") as HTMLElement;
    expect(card.classList.contains("card")).toBe(true);
  });

  it("[sd-card] 속성 셀렉터에도 .card CSS 클래스를 부여한다", () => {
    TestBed.configureTestingModule({ imports: [SdCardAttrTestHost] });
    const fixture = TestBed.createComponent(SdCardAttrTestHost);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector("[sd-card]") as HTMLElement;
    expect(card.classList.contains("card")).toBe(true);
  });
});
