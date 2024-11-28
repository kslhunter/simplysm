import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import qrcode from "qrcode";
import { $effect } from "../utils/$hooks";

/**
 * QR코드 컨트롤 컴포넌트
 * 
 * 텍스트를 QR코드로 변환하여 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-qrcode 
 *   [value]="'https://example.com'"
 *   [scale]="2">
 * </sd-qrcode>
 * ```
 */
@Component({
  selector: "sd-qrcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <canvas #canvasEl></canvas> `
})
export class SdQrcodeControl {
  /** QR코드로 변환할 텍스트 값 */
  value = input<string>();

  /** QR코드의 크기 배율 */
  scale = input(1);

  /** QR코드를 그릴 캔버스 엘리먼트에 대한 참조 */
  canvasElRef = viewChild.required<any, ElementRef<HTMLCanvasElement>>("canvasEl", { read: ElementRef });

  constructor() {
    // value, scale, canvasElRef가 변경될 때마다 QR코드를 다시 그립니다
    $effect([this.canvasElRef, this.value, this.scale], async () => {
      await qrcode.toCanvas(this.canvasElRef().nativeElement, this.value() ?? "", {
        scale: this.scale()
      });
    });
  }
}