import { DestroyRef, Directive, ElementRef, inject, output } from "@angular/core";

@Directive({
  selector: "[sdIntersection]",
  standalone: true,
})
export class SdIntersectionDirective {
  private readonly _elRef = inject(ElementRef);
  private readonly _destroyRef = inject(DestroyRef);

  sdIntersection = output<SdIntersectionEvent>();

  constructor() {
    const observer = new IntersectionObserver((entries) => {
      if (entries.length === 0) return;

      this.sdIntersection.emit({ entry: entries[entries.length - 1] });
    });
    observer.observe(this._elRef.nativeElement);

    this._destroyRef.onDestroy(() => {
      observer.disconnect();
    });
  }
}

export interface SdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
