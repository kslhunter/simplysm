import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";

import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { transformBoolean } from "../utils/transforms";
import { useRipple } from "../utils/useRipple";
import { SdIconControl } from "./SdIconControl";
import { $model } from "../utils/$hooks";

/**
 * 체크박스 컨트롤
 * 
 * 예제:
 * ```html
 * <sd-checkbox [(value)]="checked">체크박스</sd-checkbox>
 * ```
 * 
 * 체크박스 컨트롤은 사용자가 선택할 수 있는 체크박스를 제공합니다.
 * - 체크박스와 라디오 모드를 지원합니다
 * - 키보드 접근성을 지원합니다
 * - 리플 효과가 적용됩니다
 * - 비활성화 상태를 지원합니다
 * 
 * @property value - 체크박스 값 (기본값: false)
 * @property valueChange - 체크박스 값 변경 이벤트
 * @property radio - 라디오 모드 여부 (기본값: false)
 * @property disabled - 비활성화 여부 (기본값: false)
 * @property contentStyle - 내용 영역에 적용할 스타일
 */
@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdIconControl,
  ],
  template: `
    <div class="_indicator_rect">
      <div class="_indicator">
        @if (!radio()) {
          <sd-icon [icon]="icon()" />
        } @else {
          <div></div>
        }
      </div>
      2
    </div>
    <div class="_contents" [style]="contentStyle()">
      <ng-content />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";
      @import "../scss/mixins";

      sd-checkbox {
        @include form-control-base();
        color: inherit;
        cursor: pointer;
        border-radius: var(--border-radius-xs);

        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2 + 2px);
        gap: var(--gap-sm);

        > ._indicator_rect {
          display: inline-block;
          //vertical-align: calc((1em - var(--line-height)) / 2);
          vertical-align: middle;
          user-select: none;

          width: calc(var(--font-size-default) + 2px);
          height: calc(var(--font-size-default) + 2px);
          border: 1px solid var(--trans-light);
          background: var(--theme-secondary-lightest);
          border-radius: var(--border-radius-xs);

          > ._indicator {
            text-align: center;
            opacity: 0;
            color: white;

            > sd-icon > svg {
              vertical-align: top;
            }
          }
        }

        ._contents {
          display: inline-block;
          vertical-align: top;
          padding-left: var(--gap-sm);
        }

        > ._indicator_rect + ._contents:empty {
          display: none;
        }

        &:focus > ._indicator_rect {
          border-color: var(--theme-primary-dark);
        }

        &[sd-checked="true"] {
          > ._indicator_rect {
            background: var(--theme-primary-default);

            > ._indicator {
              opacity: 1;
            }
          }
        }

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            > ._indicator_rect {
              background: var(--theme-#{$key}-lightest);

              > ._indicator {
                color: var(--theme-#{$key}-default);
              }
            }

            &:focus {
              > ._indicator_rect {
                border-color: var(--theme-#{$key}-default);
              }
            }

            &[sd-checked="true"] {
              > ._indicator_rect {
                background: var(--theme-#{$key}-default);

                > ._indicator {
                  color: white;
                }
              }
            }
          }
        }

        &[sd-theme="white"] {
          > ._indicator_rect {
            background: white;
            border-color: var(--text-trans-lightest);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--text-trans-default);
            }
          }

          &[sd-checked="true"] {
            > ._indicator_rect {
              background: var(--theme-primary-default);
            }
          }
        }

        &[sd-radio="true"] {
          > ._indicator_rect {
            border-radius: 100%;
            padding: var(--gap-xs);

            > ._indicator {
              border-radius: 100%;
              width: 100%;
              height: 100%;
              background: var(--theme-primary-default);
            }
          }

          &[sd-checked="true"] {
            > ._indicator_rect {
              background: var(--theme-secondary-lightest);
              border-color: var(--theme-primary-dark);
              //background: var(--theme-primary-default);
            }
          }
        }

        &[sd-size="sm"] {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2 + 2px);
          padding: var(--gap-xs) var(--gap-sm);
          gap: var(--gap-xs);
        }

        &[sd-size="lg"] {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2 + 2px);
          padding: var(--gap-default) var(--gap-lg);
          gap: var(--gap-default);
        }

        &[sd-inset="true"] {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2);
          border: none;
          justify-content: center;

          &[sd-size="sm"] {
            height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2);
          }

          &[sd-size="lg"] {
            height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2);
          }
        }

        &[sd-inline="true"] {
          display: inline-block;
          vertical-align: top;
          padding: 0;
          border: none;
          height: calc(var(--font-size-default) * var(--line-height-strip-unit));
          width: auto;
        }

        &[sd-disabled="true"] {
          > ._indicator_rect {
            background: var(--theme-grey-lighter);
            border: 1px solid var(--trans-light);

            > ._indicator {
              color: var(--theme-grey-default);
            }
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--theme-grey-default);
            }
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-checked]": "value()",
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-inset]": "inset()",
    "[attr.sd-radio]": "radio()",
    "[attr.sd-size]": "size()",
    "[attr.sd-theme]": "theme()",
    "[attr.tabindex]": "0",
  },
})
export class SdCheckboxControl {
  /** 아이콘 설정 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 체크박스 값 */
  _value = input(false, { alias: "value", transform: transformBoolean });
  /** 체크박스 값 변경 이벤트 */
  _valueChange = output<boolean>({ alias: "valueChange" });
  /** 체크박스 값 모델 */
  value = $model(this._value, this._valueChange);

  /** 체크 아이콘 */
  icon = input(this.icons.check);
  /** 라디오 모드 여부 (기본값: false) */
  radio = input(false, { transform: transformBoolean });
  /** 비활성화 여부 (기본값: false) */
  disabled = input(false, { transform: transformBoolean });
  /** 크기 설정 ("sm" | "lg") */
  size = input<"sm" | "lg">();
  /** 인라인 스타일 적용 여부 (기본값: false) */
  inline = input(false, { transform: transformBoolean });
  /** 내부 삽입 모드 여부 (기본값: false) */
  inset = input(false, { transform: transformBoolean });
  /** 테마 설정 */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey" | "white">();
  /** 내용 영역에 적용할 스타일 */
  contentStyle = input<string>();

  /** 생성자 */
  constructor() {
    useRipple(() => !this.disabled());
  }

  /** 클릭 이벤트 핸들러 */
  @HostListener("click")
  onClick() {
    if (this.disabled()) return;
    if (this.radio()) {
      this.value.set(true);
    }
    else {
      this.value.update((v) => !v);
    }
  }

  /** 키보드 이벤트 핸들러 */
  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === " ") {
      if (this.disabled()) return;
      if (this.radio()) {
        this.value.set(true);
      }
      else {
        this.value.update((v) => !v);
      }
    }
  }
}
