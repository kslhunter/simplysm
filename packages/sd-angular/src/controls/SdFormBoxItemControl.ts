import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  forwardRef,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdFormBoxControl } from "./SdFormBoxControl";
import { NgTemplateOutlet } from "@angular/common";
import { $computed } from "../utils/$hooks";


@Component({
  selector: "sd-form-box-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet],
  styles: [
    /* language=SCSS */ `
      sd-form-box-item {
        > label {
          white-space: nowrap;
          font-weight: bold;
          border: 1px solid transparent;
        }

        &[sd-layout="cascade"] {
          display: block;

          > label {
            display: block;
            margin-bottom: var(--gap-xs);
          }

          @media all and (pointer: coarse) {
            margin-bottom: var(--gap-default);

            > label {
              margin-bottom: var(gap-xxs);
            }
          }
        }

        &[sd-layout="table"] {
          display: table-row;
          vertical-align: top;

          > label {
            display: table-cell;
            vertical-align: top;
            padding: var(--gap-sm) var(--gap-default) calc(var(--gap-sm) * 2) 0;
            text-align: right;
            width: 0;
          }

          > ._content {
            display: table-cell;
            vertical-align: top;
            padding-bottom: var(--gap-sm);
          }

          &:last-child {
            > label {
              padding-bottom: var(--gap-sm);
            }

            > ._content {
              padding-bottom: 0;
            }
          }
        }

        &[sd-layout="inline"] {
          display: flex;
          flex-wrap: nowrap;
          align-items: center;

          > label {
            display: block;
            white-space: nowrap;
            padding-left: var(--gap-sm);
            padding-right: var(--gap-sm);
          }
        }

        &[sd-layout="none"] {
          display: contents;
        }

        &[sd-label-align="left"] {
          > label {
            text-align: left;
          }
        }

        &[sd-label-align="right"] {
          > label {
            text-align: right;
          }
        }

        &[sd-label-align="center"] {
          > label {
            text-align: center;
          }
        }

        &[sd-no-label="true"] {
          > label {
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
        }
      }
    `,
  ],
  template: `
    <label
      [style.width]="labelWidth()"
      [hidden]="layout() === 'none'"
      [attr.title]="labelTooltip()"
      [class.help]="labelTooltip()"
    >
      @if (!labelTemplateRef()) {
        <ng-container>{{ label() }}</ng-container>
      } @else {
        <ng-template [ngTemplateOutlet]="labelTemplateRef()!" />
      }
    </label>
    <div class="_content">
      <ng-content></ng-content>
    </div>
  `,
  host: {
    "[attr.sd-label-align]": "labelAlign()",
    "[attr.sd-layout]": "layout()",
    "[attr.sd-no-label]": "label() == null && !labelTemplateRef()",
  },
})
export class SdFormBoxItemControl {
  /** 부모 폼 박스 컨트롤에 대한 참조 */
  #parentControl = inject<SdFormBoxControl>(forwardRef(() => SdFormBoxControl));

  /** 폼 아이템의 라벨 텍스트 */
  label = input<string>();

  /** 라벨에 표시될 툴팁 텍스트 */
  labelTooltip = input<string>();

  /** 라벨의 커스텀 템플릿 참조 */
  labelTemplateRef = contentChild<any, TemplateRef<void>>("label", { read: TemplateRef });

  /** 부모로부터 상속받은 라벨 정렬 방식 */
  labelAlign = $computed(() => this.#parentControl.labelAlign());

  /** 부모로부터 상속받은 레이아웃 스타일 */
  layout = $computed(() => this.#parentControl.layout());

  /** 
   * 라벨의 너비를 계산
   * - table 레이아웃일 경우 부모의 labelWidth 값을 사용
   * - 그 외의 경우 undefined 반환
   */
  labelWidth = $computed(() => {
    const layout = this.#parentControl.layout();
    return layout === "table" ? this.#parentControl.labelWidth() : undefined;
  });
}
