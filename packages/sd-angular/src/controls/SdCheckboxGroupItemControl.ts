import { ChangeDetectionStrategy, Component, forwardRef, inject, input, ViewEncapsulation } from "@angular/core";
import { SdCheckboxGroupControl } from "./SdCheckboxGroupControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { $computed } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";

/**
 * 체크박스 그룹의 개별 항목 컴포넌트
 * 
 * 체크박스 그룹 내에서 사용되는 개별 체크박스 항목을 구현하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-checkbox-group [(value)]="selectedItems">
 *   <sd-checkbox-group-item [value]="item1">항목 1</sd-checkbox-group-item>
 *   <sd-checkbox-group-item [value]="item2">항목 2</sd-checkbox-group-item>
 * </sd-checkbox-group>
 * 
 * <!-- 인라인 스타일 적용 -->
 * <sd-checkbox-group [(value)]="selectedItems">
 *   <sd-checkbox-group-item [value]="item1" [inline]="true">인라인 항목 1</sd-checkbox-group-item>
 *   <sd-checkbox-group-item [value]="item2" [inline]="true">인라인 항목 2</sd-checkbox-group-item>
 * </sd-checkbox-group>
 * ```
 * 
 * @remarks
 * - 체크박스 그룹 내에서만 사용할 수 있습니다
 * - 부모 그룹의 value 배열에 자동으로 추가/제거됩니다
 * - 부모 그룹의 비활성화 상태를 상속받습니다
 * - 인라인 스타일을 지원합니다
 * - 제네릭을 통해 다양한 타입의 값을 처리할 수 있습니다
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
