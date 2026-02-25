import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { PwaUpdateProvider } from "../../src/providers/PwaUpdateProvider";
import { NotificationProvider } from "../../src/components/feedback/notification/NotificationProvider";

describe("PwaUpdateProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children correctly", () => {
    const { getByText } = render(() => (
      <NotificationProvider>
        <PwaUpdateProvider>
          <div>child content</div>
        </PwaUpdateProvider>
      </NotificationProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });
});
