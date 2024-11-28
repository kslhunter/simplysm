import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";
import { $model } from "../utils/$hooks";

/**
 * `SdCheckboxGroupControl`은 체크박스 그룹을 관리하는 Angular 컴포넌트입니다.
 * 
 * 이 컴포넌트는 다음과 같은 기능을 제공합니다:
 * - 다중 체크박스 선택 관리
 * - 양방향 데이터 바인딩
 * - 비활성화 상태 지원
 * 
 * @example
 * ```html
 * <sd-checkbox-group [(value)]="selectedItems">
 *   <sd-checkbox [value]="item1">항목 1</sd-checkbox>
 *   <sd-checkbox [value]="item2">항목 2</sd-checkbox>
 * </sd-checkbox-group>
 * ```
 * 
 * @property value - 선택된 항목들의 배열
 * @property disabled - 그룹 전체 비활성화 상태 여부
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
