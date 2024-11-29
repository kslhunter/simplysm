import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdUseRippleDirective } from "../directives/SdUseRippleDirective";
import { transformBoolean } from "../utils/transforms";

/**
 * 버튼 컴포넌트
 * 
 * 클릭 가능한 버튼을 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-button>버튼</sd-button>
 * 
 * <!-- 테마 적용 -->
 * <sd-button theme="primary">기본 테마</sd-button>
 * <sd-button theme="info">정보 테마</sd-button>
 * 
 * <!-- 크기 조절 -->
 * <sd-button size="sm">작은 버튼</sd-button>
 * <sd-button size="lg">큰 버튼</sd-button>
 * 
 * <!-- 비활성화 -->
 * <sd-button [disabled]="true">비활성화된 버튼</sd-button>
 * ```
 * 
 * @remarks
 * - 클릭 가능한 버튼을 표시합니다
 * - 다양한 테마 색상을 지원합니다 (primary, info, success 등)
 * - 여러 크기 옵션을 제공합니다 (sm, md, lg)
 * - 클릭 시 물결 효과(ripple)가 표시됩니다
 * - disabled 상태를 지원합니다
 * - hover 시 배경색이 변경됩니다
 * - 키보드 탐색 및 접근성을 지원합니다
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
  /** 버튼의 타입 (기본값: "button") */
  type = input<"button" | "submit">("button");

  /** 
   * 버튼의 테마
   * - primary: 기본 강조 테마
   * - secondary: 보조 강조 테마
   * - info: 정보 표시 테마
   * - success: 성공 표시 테마
   * - warning: 경고 표시 테마
   * - danger: 위험 표시 테마
   * - grey: 회색 테마
   * - blue-grey: 청회색 테마
   * - link: 링크 스타일 테마
   * - link-*: 각 테마의 링크 스타일 버전
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

  /** 인라인 표시 여부 (기본값: false) */
  inline = input(false, { transform: transformBoolean });

  /** 버튼을 안쪽으로 들어가 보이게 할지 여부 (기본값: false) */
  inset = input(false, { transform: transformBoolean });

  /** 
   * 버튼의 크기
   * - sm: 작은 크기
   * - lg: 큰 크기
   */
  size = input<"sm" | "lg">();

  /** 버튼 비활성화 여부 (기본값: false) */
  disabled = input(false, { transform: transformBoolean });

  /** 버튼에 적용할 추가 스타일 */
  buttonStyle = input<string>();

  /** 버튼에 적용할 추가 클래스 */
  buttonClass = input<string>();
}
