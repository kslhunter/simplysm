import {Directive, ElementRef, EventEmitter, inject, NgZone, OnDestroy, OnInit, Output} from "@angular/core";

@Directive({
  selector: "[sdResize]",
  standalone: true
})
export class SdResizeDirective implements OnInit, OnDestroy {
  private readonly _elRef = inject(ElementRef);
  private readonly _ngZone = inject(NgZone);

  @Output()
  public readonly sdResize = new EventEmitter<ResizeObserverEntry>();

  private _observer?: ResizeObserver;

  public ngOnInit(): void {
    this._observer = new ResizeObserver((entries) => {
      const entry = entries.single();
      if (!entry) return;

      this._ngZone.run(() => {
        this.sdResize.emit(entry);
      });
    });
    this._observer.observe(this._elRef.nativeElement);
  }

  public ngOnDestroy(): void {
    this._observer?.disconnect();
    delete this._observer;
  }
}
