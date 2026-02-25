import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createMountTransition } from "../../src/hooks/createMountTransition";

// SolidJS createEffect is scheduled as a microtask
// Helper function to wait until effect runs
const flushEffects = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("createMountTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mounted=false and animating=false when open=false", () => {
    createRoot((dispose) => {
      const { mounted, animating } = createMountTransition(() => false);
      expect(mounted()).toBe(false);
      expect(animating()).toBe(false);
      dispose();
    });
  });

  it("mounted=true when open changes to true", async () => {
    const outerDispose = await new Promise<() => void>((resolveDispose) => {
      void createRoot(async (dispose) => {
        const [open, setOpen] = createSignal(false);
        const { mounted } = createMountTransition(open);

        setOpen(true);
        await flushEffects();

        expect(mounted()).toBe(true);
        resolveDispose(dispose);
      });
    });
    outerDispose();
  });

  it("animating=false and mounted=false after fallback timer when open changes to false", async () => {
    const outerDispose = await new Promise<() => void>((resolveDispose) => {
      void createRoot(async (dispose) => {
        const [open, setOpen] = createSignal(true);
        const { mounted, animating } = createMountTransition(open);

        await flushEffects();
        expect(mounted()).toBe(true);

        setOpen(false);
        await flushEffects();

        expect(animating()).toBe(false);

        vi.advanceTimersByTime(200);
        expect(mounted()).toBe(false);

        resolveDispose(dispose);
      });
    });
    outerDispose();
  });

  it("immediately unmounts via unmount()", async () => {
    const outerDispose = await new Promise<() => void>((resolveDispose) => {
      void createRoot(async (dispose) => {
        const [open, setOpen] = createSignal(true);
        const { mounted, unmount } = createMountTransition(open);

        await flushEffects();
        expect(mounted()).toBe(true);

        setOpen(false);
        await flushEffects();

        unmount();
        expect(mounted()).toBe(false);

        resolveDispose(dispose);
      });
    });
    outerDispose();
  });
});
