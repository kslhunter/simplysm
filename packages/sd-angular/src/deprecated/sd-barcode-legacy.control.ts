import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import jsbarcode from "jsbarcode";
import { $effect } from "../utils/bindings/$effect";

/**
 * jsbarcode 라이브러리를 사용하여 바코드를 렌더링하는 Angular 컴포넌트입니다.
 * 이 컴포넌트는 구성 가능한 속성을 가진 SVG 바코드를 생성합니다.
 *
 * @deprecated
 */
@Component({
  selector: "sd-barcode-legacy",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <svg #svgEl></svg>
  `,
})
export class SdBarcodeLegacyControl {
  /**
   * 바코드로 인코딩될 값입니다.
   * 이것은 바코드로 표현될 데이터입니다.
   */
  value = input<string>();

  /**
   * 바코드의 유형/형식입니다.
   * 기본값은 "code128"이지만, jsbarcode에서 지원하는 다른 형식으로 변경할 수 있습니다.
   */
  type = input("code128");

  /**
   * 바코드의 각 라인 너비입니다.
   * 기본값은 1입니다.
   */
  lineWidth = input(1);

  /**
   * 바코드의 높이(픽셀 단위)입니다.
   * 기본값은 58입니다.
   */
  height = input(58);

  /**
   * 바코드가 렌더링될 템플릿의 SVG 요소에 대한 참조입니다.
   */
  svgElRef = viewChild.required<any, ElementRef<SVGElement>>("svgEl", { read: ElementRef });

  /**
   * 컴포넌트를 초기화하고 입력 속성이 변경될 때마다
   * 바코드를 렌더링하는 효과를 설정합니다.
   */
  constructor() {
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
