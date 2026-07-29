import { Component, ElementRef, inject, signal } from "@angular/core";
import { injectDragResize } from "../../../src/core/modal/injectDragResize";

/**
 * `sd-modal` 의 배치 조건(위치 지정된 호스트 + 상하 padding + 중앙 정렬 dialog)을 그대로 재현한다.
 * 이 조건이 빠지면 좌표계 불일치가 드러나지 않아 결함이 테스트를 통과한다.
 */
@Component({
  selector: "test-drag-resize-host",
  standalone: true,
  template: `<div class="_dialog"></div>`,
  styles: [
    `
      :host {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        padding-top: 40px;
      }

      ._dialog {
        position: relative;
        margin: 0 auto;
        width: 400px;
        height: 300px;
      }
    `,
  ],
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
