import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import qrcode from "qrcode";
import { $effect } from "../utils/$hooks";

/**
 * QR코드 컨트롤
 *
 * 텍스트 값을 QR코드로 변환하여 표시하는 컨트롤입니다.
 *
 * @example
 *
 * <sd-qrcode [value]="'https://example.com'" [scale]="2"></sd-qrcode>
 *
 *
 * @remarks
 * - QR코드의 크기는 scale 값을 통해 조절할 수 있습니다.
 * - value가 변경되면 자동으로 QR코드가 다시 생성됩니다.
 * - 내부적으로 'qrcode' 라이브러리를 사용합니다.
 */
@Component({
  selector: "sd-qrcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <canvas #canvasEl></canvas> `,
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
        scale: this.scale(),
      });
    });
  }
}