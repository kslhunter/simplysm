import { ChangeDetectionStrategy, Component, forwardRef, inject, input, ViewEncapsulation } from "@angular/core";
import { SdCheckboxGroupControl } from "./SdCheckboxGroupControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { $computed } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";

/**
 * `SdCheckboxGroupItemControl`은 체크박스 그룹 내의 개별 체크박스 항목을 관리하는 Angular 컴포넌트입니다.
 * 
 * 이 컴포넌트는 다음과 같은 기능을 제공합니다:
 * - 부모 체크박스 그룹과의 연동
 * - 개별 체크박스의 선택 상태 관리
 * - 인라인 스타일 지원
 * 
 * @example
 * ```html
 * <sd-checkbox-group [(value)]="selectedItems">
 *   <sd-checkbox-group-item [value]="item1">항목 1</sd-checkbox-group-item>
 *   <sd-checkbox-group-item [value]="item2" [inline]="true">항목 2</sd-checkbox-group-item>
 * </sd-checkbox-group>
 * ```
 * 
 * @property value - 체크박스 항목의 값 (필수)
 * @property inline - 인라인 스타일 적용 여부 (기본값: false)
 */
@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl],
  template: `
    <sd-checkbox
      [value]="isSelected()"
      (valueChange)="onSelectedChange($event)"
      [inline]="inline()"
      [disabled]="disabled()"
    >
      <ng-content></ng-content>
    </sd-checkbox>
  `,
})
export class SdCheckboxGroupItemControl<T> {
  /** 부모 체크박스 그룹 컨트롤에 대한 참조 */
  #parentControl = inject<SdCheckboxGroupControl<T>>(forwardRef(() => SdCheckboxGroupControl));

  /** 체크박스 항목의 값 */
  value = input.required<T>();

  /** 체크박스의 인라인 스타일 적용 여부 (기본값: false) */
  inline = input(false, { transform: transformBoolean });

  /** 현재 체크박스 항목이 선택되었는지 여부를 계산 */
  isSelected = $computed(() => this.#parentControl.value().includes(this.value()));

  /** 부모 그룹의 비활성화 상태를 상속 */
  disabled = $computed(() => this.#parentControl.disabled());

  /** 
   * 체크박스 선택 상태가 변경될 때 호출되는 핸들러
   * @param selected 새로운 선택 상태
   */
  onSelectedChange(selected: boolean): void {
    this.#parentControl.value.update((v) => {
      if (selected) {
        return [...v, this.value()];
      }
      else {
        return v.filter((item) => item !== this.value());
      }
    });
  }
}
