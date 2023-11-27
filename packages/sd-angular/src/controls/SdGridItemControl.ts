import {ChangeDetectionStrategy, Component, ElementRef, inject, Input, NgZone, OnDestroy, OnInit} from "@angular/core";
import {coercionNumber} from "../utils/commons";

@Component({
  selector: "sd-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content/>`,
  styles: [/* language=SCSS */ `
    :host {
      height: 100%;
    }
  `]
})
export class SdGridItemControl implements OnInit, OnDestroy {
  @Input({required: true, transform: coercionNumber})
  colSpan!: number;

  @Input({alias: "colSpan.sm", transform: coercionNumber})
  colSpanSm?: number;

  @Input({alias: "colSpan.xs", transform: coercionNumber})
  colSpanXs?: number;

  @Input({alias: "colSpan.xxs", transform: coercionNumber})
  colSpanXxs?: number;

  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #ngZone = inject(NgZone);

  #resizeObserver?: ResizeObserver;

  ngOnInit() {
    this.#ngZone.runOutsideAngular(() => {
      const parentEl = this.#elRef.nativeElement.parentElement!;
      this.#resizeObserver = new ResizeObserver(() => {
        if (parentEl.offsetWidth < 800) {
          this.#elRef.nativeElement.style.gridColumnEnd = `span ${this.colSpanXxs ?? this.colSpanXs ?? this.colSpanSm ?? this.colSpan}`;
        }
        else if (parentEl.offsetWidth < 1024) {
          this.#elRef.nativeElement.style.gridColumnEnd = `span ${this.colSpanXs ?? this.colSpanSm ?? this.colSpan}`;
        }
        else if (parentEl.offsetWidth < 1280) {
          this.#elRef.nativeElement.style.gridColumnEnd = `span ${this.colSpanSm ?? this.colSpan}`;
        }
        else {
          this.#elRef.nativeElement.style.gridColumnEnd = `span ${this.colSpan}`;
        }
      });
      this.#resizeObserver.observe(parentEl);
    });
  }

  ngOnDestroy(): void {
    this.#resizeObserver?.disconnect();
  }
}