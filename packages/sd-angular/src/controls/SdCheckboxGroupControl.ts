import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";
import { $model } from "../utils/$hooks";

/**
 * 체크박스 그룹 컴포넌트
 * 
 * 여러 개의 체크박스를 그룹으로 관리하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-checkbox-group [(value)]="selectedItems">
 *   <sd-checkbox [value]="item1">항목 1</sd-checkbox>
 *   <sd-checkbox [value]="item2">항목 2</sd-checkbox>
 *   <sd-checkbox [value]="item3">항목 3</sd-checkbox>
 * </sd-checkbox-group>
 * 
 * <!-- 비활성화된 그룹 -->
 * <sd-checkbox-group [disabled]="true">
 *   <sd-checkbox>비활성화된 항목 1</sd-checkbox>
 *   <sd-checkbox>비활성화된 항목 2</sd-checkbox>
 * </sd-checkbox-group>
 * ```
 * 
 * @remarks
 * - 여러 체크박스를 하나의 그룹으로 관리합니다
 * - 선택된 항목들의 배열을 value로 관리합니다
 * - 양방향 바인딩을 지원합니다
 * - 그룹 전체의 비활성화를 지원합니다
 * - 제네릭을 통해 다양한 타입의 값을 처리할 수 있습니다
 */
@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
})
export class SdCheckboxGroupControl<T> {
  /** 체크박스 그룹에서 선택된 항목들의 배열 (기본값: []) */
  _value = input<T[]>([], { alias: "value" });
  /** 체크박스 그룹의 선택 항목이 변경될 때 발생하는 이벤트 */
  _valueChange = output<T[]>({ alias: "valueChange" });
  /** 체크박스 그룹의 선택 항목을 양방향 바인딩하기 위한 모델 */
  value = $model(this._value, this._valueChange);

  /** 체크박스 그룹 전체의 비활성화 상태 여부 (기본값: false) */
  disabled = input(false, { transform: transformBoolean });
}
