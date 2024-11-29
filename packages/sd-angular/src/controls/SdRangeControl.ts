import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from "@angular/core";
import { SdTextfieldControl, TSdTextfieldTypes } from "./SdTextfieldControl";
import { transformBoolean } from "../utils/transforms";
import { $model } from "../utils/$hooks";

/**
 * 범위 입력 컨트롤
 *
 * 시작값과 종료값을 입력받을 수 있는 범위 선택 컴포넌트입니다.
 *
 * @example
 *
 * <sd-range type="number" [(from)]="startValue" [(to)]="endValue" [required]="true"></sd-range>
 *
 *
 * @remarks
 * - 시작값과 종료값을 입력할 수 있는 두 개의 텍스트필드로 구성됩니다.
 * - 텍스트필드 사이에 '~' 구분자가 표시됩니다.
 * - number, text 등 다양한 타입을 지원합니다.
 * - 양방향 바인딩을 통해 값을 쉽게 관리할 수 있습니다.
 */
@Component({
  selector: "sd-range",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTextfieldControl],
  template: `
    <!--suppress TypeScriptValidateTypes -->
    <sd-textfield [type]="type()" [(value)]="from" [required]="required()" [disabled]="disabled()" />
    <div>~</div>
    <sd-textfield [type]="type()" [(value)]="to" [required]="required()" [disabled]="disabled()" />
  `,
  styles: [
    /* language=SCSS */ `
      sd-range {
        display: flex;
        flex-direction: row;
        gap: var(--gap-sm);
        align-items: center;
      }
    `,
  ],
})
export class SdRangeControl<K extends keyof TSdTextfieldTypes> {
  /** 입력 필드의 타입 */
  type = input.required<K>();

  /** 시작값 */
  _from = input<TSdTextfieldTypes[K] | undefined>(undefined, { alias: "from" });
  /** 시작값 변경 이벤트 */
  _fromChange = output<TSdTextfieldTypes[K] | undefined>({ alias: "fromChange" });
  /** 시작값 양방향 바인딩을 위한 모델 */
  from = $model(this._from, this._fromChange);

  /** 종료값 */
  _to = input<TSdTextfieldTypes[K] | undefined>(undefined, { alias: "to" });
  /** 종료값 변경 이벤트 */
  _toChange = output<TSdTextfieldTypes[K] | undefined>({ alias: "toChange" });
  /** 종료값 양방향 바인딩을 위한 모델 */
  to = $model(this._to, this._toChange);

  /** 필수 입력 여부 */
  required = input(false, { transform: transformBoolean });
  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });
}
