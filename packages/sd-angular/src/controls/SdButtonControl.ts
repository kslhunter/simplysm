import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdUseRippleDirective } from "../directives/SdUseRippleDirective";
import { transformBoolean } from "../utils/transforms";

/**
 * 버튼 컨트롤 컴포넌트
 * 
 * 기본적인 버튼 기능을 제공하는 컴포넌트입니다.
 * 리플 효과와 함께 클릭 가능한 버튼을 표시합니다.
 * 
 * @example
 * ```html
 * <sd-button>버튼</sd-button>
 * <sd-button [disabled]="true">비활성화된 버튼</sd-button>
 * ```
 */
@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdUseRippleDirective],
  template: `
    <button
      tabindex="0"
      [type]="type()"
      [disabled]="disabled()"
      [class]="buttonClass()"
      [style]="buttonStyle()"
      [sdUseRipple]="!disabled()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";
      @import "../scss/mixins";

      sd-button {
        > button {
          @include form-control-base();
          user-select: none;
          padding: var(--gap-sm) var(--gap-lg);

          background: white;
          border-color: var(--border-color-default);
          border-radius: var(--border-radius-default);

          font-weight: bold;
          text-align: center;
          cursor: pointer;

          transition: background 0.1s linear;

          &:hover {
            background: var(--theme-grey-lightest);
          }

          &:disabled {
            background: white;
            border-color: var(--theme-grey-lighter);
            color: var(--text-trans-lighter);
            cursor: default;
          }
        }

        &[sd-inset="true"] > button {
          border-radius: 0;
          border: none;
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }

          &:disabled {
            background: white;
            border-color: var(--theme-grey-lighter);
            color: var(--text-trans-default);
            cursor: default;
          }
        }

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] > button {
            background: var(--theme-#{$key}-default);
            border-color: var(--theme-#{$key}-default);
            color: var(--text-trans-rev-default);

            &:hover {
              background: var(--theme-#{$key}-dark);
              border-color: var(--theme-#{$key}-dark);
              color: var(--text-trans-rev-default);
            }

            &:disabled {
              background: var(--theme-grey-lighter);
              border-color: var(--theme-grey-lighter);
              color: var(--text-trans-lighter);
              cursor: default;
            }
          }
        }

        &[sd-theme="link"] > button {
          border-color: transparent;
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }

          &:disabled {
            border-color: transparent;
            color: var(--text-trans-lighter);
          }
        }

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="link-#{$key}"] > button {
            border-color: transparent;
            color: var(--theme-#{$key}-default);

            &:hover {
              color: var(--theme-#{$key}-darker);
            }

            &:disabled {
              border-color: transparent;
              color: var(--text-trans-lighter);
            }
          }
        }

        &[sd-inline="true"] > button {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[sd-size="sm"] > button {
          //font-weight: normal;
          padding: var(--gap-xs) var(--gap-default);
        }

        &[sd-size="lg"] > button {
          padding: var(--gap-default) var(--gap-xl);
          // border-radius:2 px;
        }

        &[disabled="true"] {
          &:active {
            pointer-events: none;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-size]": "size()",
    "[attr.disabled]": "disabled()",
    "[attr.sd-inset]": "inset()",
  },
})
export class SdButtonControl {
  /** 버튼의 타입 ("button" | "submit") (기본값: "button") */
  type = input<"button" | "submit">("button");

  /** 
   * 버튼의 테마 색상
   * - primary: 기본 색상
   * - secondary: 보조 색상
   * - info: 정보 색상 
   * - success: 성공 색상
   * - warning: 경고 색상
   * - danger: 위험 색상
   * - grey: 회색
   * - blue-grey: 청회색
   * - link: 링크 스타일
   * - link-primary: 기본 색상 링크
   * - link-secondary: 보조 색상 링크
   * - link-info: 정보 색상 링크
   * - link-success: 성공 색상 링크 
   * - link-warning: 경고 색상 링크
   * - link-danger: 위험 색상 링크
   * - link-grey: 회색 링크
   * - link-blue-grey: 청회색 링크
   */
  theme = input<
    | "primary"
    | "secondary" 
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "grey"
    | "blue-grey"
    | "link"
    | "link-primary"
    | "link-secondary"
    | "link-info"
    | "link-success"
    | "link-warning"
    | "link-danger"
    | "link-grey"
    | "link-blue-grey"
  >();

  /** 인라인 스타일 적용 여부 (기본값: false) */
  inline = input(false, { transform: transformBoolean });

  /** 내부 삽입 모드 여부 (기본값: false) */
  inset = input(false, { transform: transformBoolean });

  /** 버튼의 크기 ("sm" | "lg") */
  size = input<"sm" | "lg">();

  /** 비활성화 여부 (기본값: false) */
  disabled = input(false, { transform: transformBoolean });

  /** 버튼에 적용할 스타일 */
  buttonStyle = input<string>();

  /** 버튼에 적용할 CSS 클래스 */
  buttonClass = input<string>();
}
