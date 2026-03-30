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
import type { ISdResizeEvent } from "../../../core/plugins/events/sd-resize-event.plugin";

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
export class SdCollapseControl {
  open = input(false, { transform: booleanAttribute });

  private readonly _contentElRef =
    viewChild.required<ElementRef<HTMLElement>>("contentEl");

  contentHeight = signal(0);

  contentMarginTop = computed(() => {
    return this.open() ? "" : `-${this.contentHeight()}px`;
  });

  contentTransition = computed(() => {
    return this.open() ? "margin-top 0.1s ease-out" : "margin-top 0.1s ease-in";
  });

  constructor() {
    afterNextRender(() => {
      this.contentHeight.set(this._contentElRef().nativeElement.offsetHeight);
    });

    effect(() => {
      // Re-measure height on open transition to handle stale values from closed state
      this.open();
      this.contentHeight.set(this._contentElRef().nativeElement.offsetHeight);
    });
  }

  onContentResize(event: ISdResizeEvent): void {
    if (event.heightChanged) {
      this.contentHeight.set(this._contentElRef().nativeElement.offsetHeight);
    }
  }
}
