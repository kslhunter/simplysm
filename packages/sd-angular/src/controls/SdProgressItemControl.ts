import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

/**
 * 프로그레스 아이템 컨트롤 컴포넌트
 * 
 * 프로그레스 바 내부에서 진행 상태를 표시하는 개별 아이템 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-progress-item 
 *   [width]="'50%'"
 *   [height]="'30px'" 
 *   [theme]="'primary'">
 * </sd-progress-item>
 * ```
 */
@Component({
  selector: "sd-progress-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";

      sd-progress-item {
        display: block;
        float: left;
        overflow: hidden;
        padding: var(--gap-sm) var(--gap-default);

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-default);
            color: var(--text-trans-default);
          }
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content> `,
  host: {
    "[style.width]": "width()",
    "[style.height]": "height()",
    "[attr.sd-theme]": "theme()",
    "[style.background]": "color()",
  },
})
export class SdProgressItemControl {
  /** 프로그레스 아이템의 너비 */
  width = input("100%");

  /** 프로그레스 아이템의 높이 */
  height = input("30px");

  /** 프로그레스 아이템의 테마 */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  /** 프로그레스 아이템의 배경색 */
  color = input<string>();
}
