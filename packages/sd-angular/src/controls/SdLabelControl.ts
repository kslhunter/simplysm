import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

/**
 * 라벨 컨트롤
 * 
 * 배경색이 있는 라벨을 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-label>기본 라벨</sd-label>
 * 
 * <!-- 테마 적용 -->
 * <sd-label theme="primary">주요 라벨</sd-label>
 * <sd-label theme="success">성공 라벨</sd-label>
 * <sd-label theme="warning">경고 라벨</sd-label>
 * 
 * <!-- 커스텀 색상 -->
 * <sd-label [color]="'#ff0000'">빨간색 라벨</sd-label>
 * 
 * <!-- 클릭 가능한 라벨 -->
 * <sd-label [clickable]="true" (click)="onLabelClick()">
 *   클릭 가능한 라벨
 * </sd-label>
 * ```
 */
@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";

      sd-label {
        display: inline-block;
        background: var(--theme-grey-darker);
        color: white;
        padding: 0 var(--gap-sm);
        border-radius: var(--border-radius-default);
        text-indent: 0;

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-default);
          }
        }

        &[sd-clickable="true"] {
          cursor: pointer;

          &:hover {
            background: var(--theme-grey-dark);

            @each $key, $val in map-get($vars, theme) {
              &[sd-theme="#{$key}"] {
                background: var(--theme-#{$key}-dark);
              }
            }
          }
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
  host: {
    "[attr.sd-theme]": "theme()",
    "[style.background]": "color()",
    "[attr.sd-clickable]": "clickable()",
  },
})
export class SdLabelControl {
  /** 라벨의 테마 */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  /** 라벨의 배경색 (테마 대신 직접 색상 지정) */
  color = input<string>();

  /** 클릭 가능 여부 */
  clickable = input(false, { transform: transformBoolean });
}
