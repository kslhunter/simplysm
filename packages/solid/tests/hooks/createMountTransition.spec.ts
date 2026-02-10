import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createMountTransition } from "../../src/hooks/createMountTransition";

// SolidJS의 createEffect는 마이크로태스크로 스케줄링되므로
// effect가 실행될 때까지 기다리는 헬퍼 함수
const flushEffects = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("createMountTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("open=false일 때 mounted=false, animating=false", () => {
    createRoot((dispose) => {
      const { mounted, animating } = createMountTransition(() => false);
      expect(mounted()).toBe(false);
      expect(animating()).toBe(false);
      dispose();
    });
  });

  it("open=true로 변경 시 mounted=true", async () => {
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

  it("open=false로 변경 시 animating=false, fallback 타이머 후 mounted=false", async () => {
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

  it("unmount()로 즉시 마운트 해제", async () => {
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
