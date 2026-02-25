import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Topbar } from "../../../../src";

describe("TopbarContainer component", () => {
  it("displays children inside the container", () => {
    const { getByText } = render(() => (
      <Topbar.Container>
        <span>Content</span>
      </Topbar.Container>
    ));

    expect(getByText("Content")).toBeTruthy();
  });

  it("merges custom classes", () => {
    const { container } = render(() => (
      // eslint-disable-next-line tailwindcss/no-custom-classname
      <Topbar.Container class="my-custom-class">
        <div>Content</div>
      </Topbar.Container>
    ));

    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains("my-custom-class")).toBe(true);
  });

  it("has data-topbar-container attribute", () => {
    const { container } = render(() => (
      <Topbar.Container>
        <div>Content</div>
      </Topbar.Container>
    ));

    const el = container.firstElementChild as HTMLElement;
    expect(el.hasAttribute("data-topbar-container")).toBe(true);
  });
});
