import { injectElementRef } from "./dom/element-ref.injector";
import { $effect } from "./hooks";

export function useShowEffect(optFn?: () => {
  type?: "l2r" | "t2b";
  enabled?: boolean;
}) {
  const _elRef = injectElementRef<HTMLElement>();

  $effect([], () => {
    Object.assign(_elRef.nativeElement.style, {
      opacity: 0,
      transform: (optFn?.().type ?? "t2b") === "t2b" ? "translateY(-1em)" : "translateX(-1em)",
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (optFn?.().enabled ?? true) {
            Object.assign(_elRef.nativeElement.style, {
              opacity: 1,
              transform: "none",
              transition: "var(--animation-duration) ease-out",
              transitionProperty: "opacity, transform",
            });
          }
          else {
            Object.assign(_elRef.nativeElement.style, {
              opacity: 1,
              transform: "none",
              transition: "none",
              transitionProperty: "none",
            });
          }
        }
      });
    });
    observer.observe(_elRef.nativeElement);
  });
}
