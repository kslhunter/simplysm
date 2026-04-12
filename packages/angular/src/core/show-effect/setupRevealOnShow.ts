import { computed, effect, ElementRef, inject, untracked } from "@angular/core";

export function setupRevealOnShow(
  optFn?: () => {
    type?: "l2r" | "t2b";
    enabled?: boolean;
  },
): void {
  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  const resolvedType = computed(() => optFn?.().type ?? "t2b");

  effect((onCleanup) => {
    const el = elRef.nativeElement;
    const type = resolvedType();

    Object.assign(el.style, {
      opacity: "0",
      transform: type === "t2b" ? "translateY(-1em)" : "translateX(-1em)",
    });

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting) return;

      const enabled = untracked(() => optFn?.().enabled ?? true);

      if (enabled) {
        Object.assign(el.style, {
          opacity: "1",
          transform: "none",
          transitionDuration: "var(--animation-duration)",
          transitionTimingFunction: "ease-out",
          transitionProperty: "opacity, transform",
        });
      } else {
        Object.assign(el.style, {
          opacity: "1",
          transform: "",
          transitionDuration: "",
          transitionTimingFunction: "",
          transitionProperty: "",
        });
      }
    });
    observer.observe(el);

    onCleanup(() => {
      observer.disconnect();
    });
  });
}
