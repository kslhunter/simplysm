import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import jsbarcode from "jsbarcode";
import { $effect } from "../utils/$hooks";

/**
 * 바코드 컴포넌트
 *
 * 텍스트를 바코드로 변환하여 표시하는 컴포넌트입니다.
 *
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-barcode value="1234567890"></sd-barcode>
 *
 * <!-- 바코드 타입 지정 -->
 * <sd-barcode value="1234567890" type="EAN13"></sd-barcode>
 *
 * <!-- 크기 조절 -->
 * <sd-barcode
 *   value="1234567890"
 *   [lineWidth]="2"
 *   [height]="100">
 * </sd-barcode>
 * ```
 *
 * @remarks
 * - 다양한 바코드 형식을 지원합니다 (CODE128, EAN13, CODE39 등)
 * - SVG 형식으로 렌더링되어 선명한 바코드를 표시합니다
 * - 바코드의 선 두께와 높이를 조절할 수 있습니다
 * - jsbarcode 라이브러리를 사용하여 바코드를 생성합니다
 * - 입력값이 변경되면 자동으로 바코드가 업데이트됩니다
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
