import { ApplicationRef, ComponentRef, createComponent, inject, Injectable } from "@angular/core";
import { $effect, $signal } from "../../utils/$hooks";
import { SdBusyContainerControl } from "./sd-busy-container.control";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  #appRef = inject(ApplicationRef);

  type = $signal<"spinner" | "bar" | "cube">("bar");
  noFade = $signal(false);

  globalBusyCount = $signal(0);

  #containerRef?: ComponentRef<SdBusyContainerControl>;

  get containerRef(): ComponentRef<SdBusyContainerControl> {
    if (this.#containerRef === undefined) {
      const compRef = createComponent(SdBusyContainerControl, {
        environmentInjector: this.#appRef.injector,
      });
      compRef.setInput("type", this.type());
      compRef.setInput("noFade", this.noFade());
      (compRef.location.nativeElement as HTMLElement).style.position = "absolute";

      this.#appRef.attachView(compRef.hostView);
      this.#containerRef = compRef;
    }

    if (this.#appRef.components.length > 0 && this.#containerRef.location.nativeElement.parentElement == null) {
      const rootComp = this.#appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(this.#containerRef.location.nativeElement);
    }

    return this.#containerRef;
  }

  constructor() {
    $effect(() => {
      this.containerRef.setInput("busy", this.globalBusyCount() > 0);
      (this.containerRef.location.nativeElement as HTMLElement).style.pointerEvents =
        this.globalBusyCount() > 0 ? "auto" : "none";
    });
  }
}
