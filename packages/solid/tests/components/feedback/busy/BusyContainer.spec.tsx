import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { BusyContainer } from "../../../../src/components/feedback/busy/BusyContainer";

describe("BusyContainer", () => {
  describe("basic rendering", () => {
    it("children이 표시된다", () => {
      const { getByText } = render(() => (
        <BusyContainer>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("busy가 false이면 오버레이가 표시되지 않는다", () => {
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
    it("ready가 false이면 children이 DOM에서 제거된다", () => {
      const { queryByText } = render(() => (
        <BusyContainer ready={false}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(queryByText("Content")).toBeNull();
    });

    it("ready가 true이면 children이 표시된다", () => {
      const { getByText } = render(() => (
        <BusyContainer ready={true}>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("ready가 undefined이면 children이 표시된다", () => {
      const { getByText } = render(() => (
        <BusyContainer>
          <span>Content</span>
        </BusyContainer>
      ));
      expect(getByText("Content")).toBeTruthy();
    });

    it("ready가 false이면 오버레이가 마운트된다", async () => {
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

    it("ready가 false에서 true로 변경되면 children이 다시 표시된다", () => {
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
