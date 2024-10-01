import { effect, HostBinding, inject, Renderer2, RendererStyleFlags2, Signal } from "@angular/core";
import { injectElementRef } from "./injectElementRef";
import { StringUtil } from "@simplysm/sd-core-common";
import { SIGNAL } from "@angular/core/primitives/signals";

export function $hostBinding<S extends Signal<any> | { value: any }>(
  hostPropertyName: Required<HostBinding>["hostPropertyName"],
  sig: S,
) {
  const renderer = inject(Renderer2);
  const element = injectElementRef<HTMLElement>().nativeElement;

  let prevClasses: string[] = [];

  effect(() => {
    const value = "value" in sig ? sig.value : SIGNAL in sig ? sig() : sig;
    const [binding, property, unit] = hostPropertyName.split(".");

    switch (binding) {
      case "style":
        renderer.setStyle(
          element,
          property,
          `${value}${(unit as string | undefined) ?? ""}`,
          property.startsWith("--") ? RendererStyleFlags2.DashCase : undefined,
        );
        break;
      case "attr":
        if (value == null) {
          renderer.removeAttribute(element, property);
        } else {
          renderer.setAttribute(element, property, String(value));
        }
        break;
      case "class":
        if (!property) {
          if (prevClasses.length) {
            prevClasses.forEach((k) => renderer.removeClass(element, k));
          }
          prevClasses = typeof value === "string" ? value.split(" ").filter(Boolean) : [];
          prevClasses.forEach((k) => renderer.addClass(element, k));
        } else {
          if (!StringUtil.isNullOrEmpty(value)) {
            renderer.addClass(element, property);
          } else {
            renderer.removeClass(element, property);
          }
        }
        break;
      default:
        renderer.setProperty(element, binding, value);
    }
  });

  return sig;
}
