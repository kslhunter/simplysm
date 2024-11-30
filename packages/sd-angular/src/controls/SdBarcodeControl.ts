import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import jsbarcode from "jsbarcode";
import { $effect } from "../utils/$hooks";

/**
 * 바코드 컨트롤 컴포넌트
 *
 * 바코드를 생성하고 표시하는 컴포넌트입니다.
 *
 * @example
 * ```html
 * <sd-barcode [value]="'123456'"></sd-barcode>
 * ```
 */
@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <svg #svgEl></svg>
  `,
})
export class SdBarcodeControl {
  /** 바코드로 변환할 값 */
  value = input<string>();
  /**
   * 바코드 타입 (기본값: CODE128)
   * @type {"CODE128" | "EAN" | "EAN13" | "EAN8" | "EAN5" | "EAN2" | "UPC" | "UPCA" | "UPCE" | "CODE39" | "ITF14" | "MSI" | "MSI10" | "MSI11" | "MSI1010" | "MSI1110" | "pharmacode" | "codabar"} 바코드 형식
   */
  type = input<"CODE128" | "EAN" | "EAN13" | "EAN8" | "EAN5" | "EAN2" | "UPC" | "UPCA" | "UPCE" | "CODE39" | "ITF14" | "MSI" | "MSI10" | "MSI11" | "MSI1010" | "MSI1110" | "pharmacode" | "codabar">("CODE128");
  /** 바코드 선의 두께 (기본값: 1) */
  lineWidth = input(1);
  /** 바코드의 높이 (기본값: 58) */
  height = input(58);
  /** SVG 요소에 대한 참조 */
  svgElRef = viewChild.required<any, ElementRef<SVGElement>>("svgEl", { read: ElementRef });

  /** 생성자 */
  constructor() {
    // 바코드 생성 및 렌더링
    $effect(() => {
      jsbarcode(this.svgElRef().nativeElement, this.value() ?? "", {
        marginTop: -5,
        marginBottom: -5,
        format: this.type(),
        width: this.lineWidth(),
        height: this.height(),
        displayValue: false,
      });
    });
  }
}
