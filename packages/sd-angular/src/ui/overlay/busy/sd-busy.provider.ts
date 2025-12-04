import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  inject,
  Injectable,
  inputBinding,
} from "@angular/core";
import { SdBusyContainerControl } from "./sd-busy-container.control";
import { $signal } from "../../../core/utils/bindings/$signal";
import { $effect } from "../../../core/utils/bindings/$effect";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  private readonly _appRef = inject(ApplicationRef);

  type = $signal<"spinner" | "bar" | "cube">("bar");

  globalBusyCount = $signal(0);

  private _containerRef?: ComponentRef<SdBusyContainerControl>;

  get containerRef(): ComponentRef<SdBusyContainerControl> {
    if (this._containerRef == null) {
      const compRef = createComponent(SdBusyContainerControl, {
        environmentInjector: this._appRef.injector,
        bindings: [
          inputBinding("type", this.type),
          inputBinding("busy", () => this.globalBusyCount() > 0),
        ],
      });
      (compRef.location.nativeElement as HTMLElement).style.position = "absolute";
      (compRef.location.nativeElement as HTMLElement).style.pointerEvents = "none";

      this._appRef.attachView(compRef.hostView);
      this._containerRef = compRef;
      document.body.appendChild(this._containerRef.location.nativeElement);
    }

    return this._containerRef;
  }

  constructor() {
    $effect(() => {
      (this.containerRef.location.nativeElement as HTMLElement).style.pointerEvents =
        this.globalBusyCount() > 0 ? "auto" : "none";
    });
  }
}
