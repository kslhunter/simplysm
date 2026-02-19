import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { PwaUpdateProvider } from "../../src/providers/PwaUpdateProvider";
import { NotificationProvider } from "../../src/components/feedback/notification/NotificationProvider";

describe("PwaUpdateProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("children을 정상적으로 렌더링한다", () => {
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
