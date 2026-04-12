import { Component, ElementRef, inject, signal } from "@angular/core";
import { injectDragResize } from "../../../src/core/modal/injectDragResize";

@Component({
  selector: "test-drag-resize-host",
  standalone: true,
  template: `<div class="_dialog" style="width:400px;height:300px;position:relative;"></div>`,
})
export class TestDragResizeHost {
  private readonly _elRef = inject(ElementRef<HTMLElement>);

  minWidthPx = signal<number | undefined>(undefined);
  minHeightPx = signal<number | undefined>(undefined);
  endCalled = false;

  dragResize = injectDragResize({
    getDialogEl: () => this._elRef.nativeElement.querySelector("._dialog"),
    minWidthPx: this.minWidthPx,
    minHeightPx: this.minHeightPx,
    onEnd: () => {
      this.endCalled = true;
    },
  });

  getDialogEl(): HTMLElement | null {
    return this._elRef.nativeElement.querySelector("._dialog");
  }
}
