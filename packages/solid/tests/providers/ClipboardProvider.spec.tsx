import { describe, it, expect } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import { ClipboardProvider } from "../../src/providers/ClipboardProvider";

describe("ClipboardProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("children을 정상적으로 렌더링한다", () => {
    const { getByText } = render(() => (
      <ClipboardProvider>
        <div>child content</div>
      </ClipboardProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });
});
