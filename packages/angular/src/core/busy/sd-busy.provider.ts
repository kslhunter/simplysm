import {
  ApplicationRef,
  createComponent,
  effect,
  EnvironmentInjector,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  type ComponentRef,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { SdBusyContainer } from "./sd-busy-container";

export type SdBusyType = "spinner" | "bar" | "cube";

@Injectable({ providedIn: "root" })
export class SdBusyProvider {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _envInjector = inject(EnvironmentInjector);

  type = signal<SdBusyType>("bar");
  globalBusyCount = signal(0);

  private _containerRef: ComponentRef<SdBusyContainer> | undefined;

  get containerRef(): ComponentRef<SdBusyContainer> {
    if (this._containerRef == null) {
      this._containerRef = createComponent(SdBusyContainer, {
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
    // SSR(프리렌더) 가드: busy 오버레이는 document 직접 조작 — 브라우저 전용
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      const busy = this.globalBusyCount() > 0;

      // busy 가 처음 true 가 되기 전엔 컨테이너를 생성하지 않음 (lazy)
      if (!busy && this._containerRef == null) return;

      const ref = this.containerRef;
      const el = ref.location.nativeElement as HTMLElement;

      ref.setInput("busy", busy);
      ref.setInput("type", this.type());
      el.style.pointerEvents = busy ? "auto" : "none";
    });
  }
}
