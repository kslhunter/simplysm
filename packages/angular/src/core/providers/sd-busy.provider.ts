import {
  ApplicationRef,
  createComponent,
  effect,
  EnvironmentInjector,
  inject,
  Injectable,
  signal,
  type ComponentRef,
} from "@angular/core";
import { SdBusyContainerControl } from "../../ui/overlay/busy/sd-busy-container.control";

export type TSdBusyType = "spinner" | "bar" | "cube";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _envInjector = inject(EnvironmentInjector);

  type = signal<TSdBusyType>("bar");
  globalBusyCount = signal(0);

  private _containerRef: ComponentRef<SdBusyContainerControl> | undefined;

  get containerRef(): ComponentRef<SdBusyContainerControl> {
    if (this._containerRef === undefined) {
      this._containerRef = createComponent(SdBusyContainerControl, {
        environmentInjector: this._envInjector,
      });
      this._appRef.attachView(this._containerRef.hostView);

      const el = this._containerRef.location.nativeElement as HTMLElement;
      el.style.position = "fixed";
      el.style.top = "0";
      el.style.left = "0";
      el.style.right = "0";
      el.style.bottom = "0";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
    }
    return this._containerRef;
  }

  constructor() {
    effect(() => {
      const busy = this.globalBusyCount() > 0;
      const ref = this.containerRef;
      const el = ref.location.nativeElement as HTMLElement;

      ref.setInput("busy", busy);
      ref.setInput("type", this.type());
      el.style.pointerEvents = busy ? "auto" : "none";
    });
  }
}
