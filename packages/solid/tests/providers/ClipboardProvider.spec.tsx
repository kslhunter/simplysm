import { describe, it, expect } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import { ClipboardProvider } from "../../src/providers/ClipboardProvider";

describe("ClipboardProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children correctly", () => {
    const { getByText } = render(() => (
      <ClipboardProvider>
        <div>child content</div>
      </ClipboardProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });
});
