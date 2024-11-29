import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

/**
 * 프로그레스 아이템 컨트롤
 *
 * 프로그레스바의 개별 아이템을 표시하는 컴포넌트입니다.
 *
 * @example
 *
 * <sd-progress-item width="30%" theme="primary">
 *   진행률 30%
 * </sd-progress-item>
 *
 *
 * @example
 *
 * <sd-progress-item width="50%" color="#ff0000" height="40px">
 *   커스텀 색상 및 높이
 * </sd-progress-item>
 *
 *
 * @remarks
 * - 너비와 높이를 지정하여 크기를 조절할 수 있습니다.
 * - 테마를 지정하거나 직접 색상을 지정할 수 있습니다.
 * - 여러 개의 프로그레스 아이템을 연속해서 배치할 수 있습니다.
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
