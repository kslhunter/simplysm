import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  signal,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import type { SdResizeEvent } from "../../core/events/sd-resize-event.plugin";

@Component({
  selector: "sd-collapse",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div
      #contentEl
      class="_content"
      [style.margin-top]="contentMarginTop()"
      [style.transition]="contentTransition()"
      (sdResize)="onContentResize($any($event))"
    >
      <ng-content />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-collapse {
        display: block;
        overflow: hidden;
      }
    `,
  ],
})
export class SdCollapse {
  open = input(false, { transform: booleanAttribute });

  private readonly _contentElRef =
    viewChild.required<ElementRef<HTMLElement>>("contentEl");

  contentHeight = signal(0);

  private readonly _initialized = signal(false);

  contentMarginTop = computed(() => {
    return this.open() ? "" : `-${this.contentHeight()}px`;
  });

  contentTransition = computed(() => {
    if (!this._initialized()) return "";
    return this.open() ? "margin-top 0.1s ease-out" : "margin-top 0.1s ease-in";
  });

  constructor() {
    afterNextRender(() => {
      this.contentHeight.set(this._contentElRef().nativeElement.offsetHeight);
      requestAnimationFrame(() => {
        this._initialized.set(true);
      });
    });

    effect(() => {
      // Re-measure height on open transition to handle stale values from closed state
      this.open();
      this.contentHeight.set(this._contentElRef().nativeElement.offsetHeight);
    });
  }

  onContentResize(event: SdResizeEvent): void {
    if (event.heightChanged) {
      this.contentHeight.set(this._contentElRef().nativeElement.offsetHeight);
    }
  }
}
