import { injectElementRef } from "../injections/inject-element-ref";
import { $effect } from "../bindings/$effect";

export function setupRevealOnShow(optFn?: () => {
  type?: "l2r" | "t2b";
  enabled?: boolean;
}) {
  const _elRef = injectElementRef<HTMLElement>();

  $effect([], () => {
    const el = _elRef.nativeElement;

    Object.assign(el.style, {
      opacity: 0,
      transform: (optFn?.().type ?? "t2b") === "t2b" ? "translateY(-1em)" : "translateX(-1em)",
    });

    const observer = new IntersectionObserver((entries) => {
      const entry = entries.first();
      if (!entry?.isIntersecting) return;

      if (optFn?.().enabled ?? true) {
        Object.assign(el.style, {
          opacity: 1,
          transform: "none",
          transition: "var(--animation-duration) ease-out",
          transitionProperty: "opacity, transform",
        });
      }
      else {
        Object.assign(el.style, {
          opacity: 1,
          transform: "none",
          transition: "none",
          transitionProperty: "none",
        });
      }
    });
    observer.observe(el);
  });
}
