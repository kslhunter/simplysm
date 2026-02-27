import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { BusyContainer } from "../../../../src/components/feedback/busy/BusyContainer";

describe("BusyContainer", () => {
  describe("basic rendering", () => {
    it("renders children", () => {
      const { getByText } = render(() => (
        <BusyContainer>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("does not show overlay when busy is false", () => {
      const { container } = render(() => (
        <BusyContainer busy={false}>
          <span>Content</span>
        </BusyContainer>
      ));
      const overlay = container.querySelector(".z-busy");
      expect(overlay).toBeNull();
    });
  });

  describe("ready prop", () => {
    it("removes children from DOM when ready is false", () => {
      const { queryByText } = render(() => (
        <BusyContainer ready={false}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(queryByText("Content")).toBeNull();
    });

    it("shows children when ready is true", () => {
      const { getByText } = render(() => (
        <BusyContainer ready={true}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("shows children when ready is undefined", () => {
      const { getByText } = render(() => (
        <BusyContainer>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("mounts overlay when ready is false", async () => {
      const { container } = render(() => (
        <BusyContainer ready={false}>
          <span>Content</span>
        </BusyContainer>
      ));
      // createMountTransition uses double rAF, wait for it
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const overlay = container.querySelector(".z-busy");
      expect(overlay).toBeTruthy();
    });

    it("shows children again when ready changes from false to true", () => {
      const [ready, setReady] = createSignal(false);
      const { queryByText } = render(() => (
        <BusyContainer ready={ready()}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(queryByText("Content")).toBeNull();
      setReady(true);
      expect(queryByText("Content")).toBeTruthy();
    });
  });
});
