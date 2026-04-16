import { DestroyRef, Directive, ElementRef, inject, output } from "@angular/core";

@Directive({
  selector: "[sdResize]",
  standalone: true,
})
export class SdResizeDirective {
  private readonly _elRef = inject(ElementRef);
  private readonly _destroyRef = inject(DestroyRef);

  sdResize = output<SdResizeEvent>();

  constructor() {
    let prevWidth = 0;
    let prevHeight = 0;
    let animationFrameId: number | undefined;

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(() => {
        const contentRect = entry.contentRect;
        const heightChanged = contentRect.height !== prevHeight;
        const widthChanged = contentRect.width !== prevWidth;
        prevHeight = contentRect.height;
        prevWidth = contentRect.width;

        this.sdResize.emit({
          heightChanged,
          widthChanged,
          target: entry.target as HTMLElement,
          contentRect: entry.contentRect,
        });
      });
    });

    resizeObserver.observe(this._elRef.nativeElement);

    this._destroyRef.onDestroy(() => {
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
    });
  }
}

export interface SdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: HTMLElement;
  contentRect: DOMRectReadOnly;
}
