import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdLabelDefaultTest,
  SdLabelColorTest,
} from "./sd-label-test.fixture";
import {
  SdNoteDefaultTest,
} from "./sd-note-test.fixture";

describe("Feature 2.6 Slice 1: sd-label", () => {
  it("color=#ff0000이면 style.background에 커스텀 색상이 적용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdLabelColorTest] })
      .createComponent(SdLabelColorTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-label") as HTMLElement;
    expect(host.style.background).toBe("rgb(255, 0, 0)");
  });

  it("ng-content로 텍스트가 프로젝션된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdLabelDefaultTest] })
      .createComponent(SdLabelDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-label") as HTMLElement;
    expect(host.textContent.trim()).toBe("기본 라벨");
  });
});

describe("Feature 2.6 Slice 1: sd-note", () => {
  it("ng-content로 텍스트가 프로젝션된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdNoteDefaultTest] })
      .createComponent(SdNoteDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-note") as HTMLElement;
    expect(host.textContent.trim()).toBe("기본 노트");
  });
});
