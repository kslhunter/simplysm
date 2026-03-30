import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TopbarContainerLayoutTest } from "./sd-topbar-container-test.fixture";

describe("Feature 4.4 Slice 1: sd-topbar-container 수직 레이아웃", () => {
  it("sd-topbar-container 안에 sd-topbar와 콘텐츠가 수직으로 배치된다 — display: flex, flex-direction: column, height: 100%", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarContainerLayoutTest],
    }).createComponent(TopbarContainerLayoutTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector(
      "sd-topbar-container",
    ) as HTMLElement;
    const styles = getComputedStyle(container);

    expect(styles.display).toBe("flex");
    expect(styles.flexDirection).toBe("column");
    // height: 100% resolves to parent's computed height (600px) in browser
    expect(styles.height).toBe("600px");
  });
});
