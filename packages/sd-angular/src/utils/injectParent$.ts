import * as ng from "@angular/core";
import { AbstractType, afterNextRender, Signal } from "@angular/core";
import { injectElementRef } from "./injectElementRef";
import { $signal } from "./$hooks";

export function injectParent$<T>(type: AbstractType<T>): Signal<T | undefined> {
  const el: HTMLElement | null = injectElementRef().nativeElement;

  const sig = $signal<T>();

  afterNextRender(() => {
    let currentEl = el.parentElement;
    if (!currentEl) {
      sig.set(undefined);
      return;
    }
    while (true) {
      const comp = getComponentByNode(currentEl);
      if ("prototype" in type ? comp instanceof type : comp instanceof (type as any)()) {
        sig.set(comp);
        return;
      }

      currentEl = currentEl.parentElement;
      if (currentEl == null) {
        sig.set(undefined);
        return;
      }
    }
  });

  return sig;
}

function getComponentByNode(node: Node) {
  const lContext = ng.ɵgetLContext(node);
  if (!lContext) return undefined;

  const lView = lContext.lView;
  if (!lView) return undefined;

  const tNode = lContext.lView[1].data[lContext.nodeIndex];
  if (tNode == null) return undefined;

  return tNode["componentOffset"] > -1 ? lView[tNode["directiveStart"] + tNode["componentOffset"]] : undefined;
}
