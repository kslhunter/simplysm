import { ApplicationRef, ComponentRef, createComponent, inject, Injectable } from "@angular/core";
import { $effect, $signal } from "../utils/hooks/hooks";
import { SdBusyContainerControl } from "../controls/sd-busy-container.control";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  private _appRef = inject(ApplicationRef);

  type = $signal<"spinner" | "bar" | "cube">("bar");
  noFade = $signal(false);

  globalBusyCount = $signal(0);

  private _containerRef?: ComponentRef<SdBusyContainerControl>;

  get containerRef(): ComponentRef<SdBusyContainerControl> {
    if (this._containerRef === undefined) {
      const compRef = createComponent(SdBusyContainerControl, {
        environmentInjector: this._appRef.injector,
      });
      compRef.setInput("type", this.type());
      compRef.setInput("noFade", this.noFade());
      (compRef.location.nativeElement as HTMLElement).style.position = "absolute";

      this._appRef.attachView(compRef.hostView);
      this._containerRef = compRef;
    }

    if (
      this._appRef.components.length > 0
      && this._containerRef.location.nativeElement.parentElement == null
    ) {
      const rootComp = this._appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(this._containerRef.location.nativeElement);
    }

    return this._containerRef;
  }

  constructor() {
    $effect(() => {
      this.containerRef.setInput("busy", this.globalBusyCount() > 0);
      (this.containerRef.location.nativeElement as HTMLElement).style.pointerEvents =
        this.globalBusyCount() > 0 ? "auto" : "none";
    });
  }
}
