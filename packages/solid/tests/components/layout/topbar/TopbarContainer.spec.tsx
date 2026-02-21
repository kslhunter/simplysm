import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Topbar } from "../../../../src";

describe("TopbarContainer 컴포넌트", () => {
  it("children이 컨테이너 내부에 표시된다", () => {
    const { getByText } = render(() => (
      <Topbar.Container>
        <span>콘텐츠</span>
      </Topbar.Container>
    ));

    expect(getByText("콘텐츠")).toBeTruthy();
  });

  it("사용자 정의 class가 병합된다", () => {
    const { container } = render(() => (
      // eslint-disable-next-line tailwindcss/no-custom-classname
      <Topbar.Container class="my-custom-class">
        <div>Content</div>
      </Topbar.Container>
    ));

    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains("my-custom-class")).toBe(true);
  });

  it("data-topbar-container 속성이 존재한다", () => {
    const { container } = render(() => (
      <Topbar.Container>
        <div>Content</div>
      </Topbar.Container>
    ));

    const el = container.firstElementChild as HTMLElement;
    expect(el.hasAttribute("data-topbar-container")).toBe(true);
  });
});
