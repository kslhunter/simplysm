import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  inject,
  Injectable,
  inputBinding,
} from "@angular/core";
import { SdBusyContainerControl } from "../controls/layout/sd-busy-container.control";
import { $signal } from "../utils/bindings/$signal";
import { $effect } from "../utils/bindings/$effect";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  #appRef = inject(ApplicationRef);

  type = $signal<"spinner" | "bar" | "cube">("bar");

  globalBusyCount = $signal(0);

  #containerRef?: ComponentRef<SdBusyContainerControl>;

  get containerRef(): ComponentRef<SdBusyContainerControl> {
    if (this.#containerRef == null) {
      const compRef = createComponent(SdBusyContainerControl, {
        environmentInjector: this.#appRef.injector,
        bindings: [
          inputBinding("type", this.type),
          inputBinding("busy", () => this.globalBusyCount() > 0),
        ],
      });
      (compRef.location.nativeElement as HTMLElement).style.position = "absolute";
      (compRef.location.nativeElement as HTMLElement).style.pointerEvents = "none";

      this.#appRef.attachView(compRef.hostView);
      this.#containerRef = compRef;
      document.body.appendChild(this.#containerRef.location.nativeElement);
    }

    return this.#containerRef;
  }

  constructor() {
    $effect(() => {
      (this.containerRef.location.nativeElement as HTMLElement).style.pointerEvents =
        this.globalBusyCount() > 0 ? "auto" : "none";
    });
  }
}
