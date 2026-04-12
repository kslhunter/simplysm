import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TopbarContainerUnitTest } from "./sd-topbar-container-unit-test.fixture";

describe("SdTopbarContainer unit", () => {
  it("host 요소가 display: flex, flex-direction: column으로 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarContainerUnitTest],
    }).createComponent(TopbarContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector(
      "sd-topbar-container",
    ) as HTMLElement;
    const styles = getComputedStyle(container);

    expect(styles.display).toBe("flex");
    expect(styles.flexDirection).toBe("column");
  });

  it("부모에 높이가 있으면 host 요소가 전체 높이를 차지한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarContainerUnitTest],
    }).createComponent(TopbarContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector(
      "sd-topbar-container",
    ) as HTMLElement;
    const styles = getComputedStyle(container);

    // Parent (host) is 500px, so 100% = 500px
    expect(styles.height).toBe("500px");
  });
});
