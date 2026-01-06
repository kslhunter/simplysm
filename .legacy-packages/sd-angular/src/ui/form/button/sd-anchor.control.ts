import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";

/**
 * 앵커 컨트롤 컴포넌트
 * 클릭 가능한 앵커 링크를 표시하는 컴포넌트
 *
 */
@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.tabindex]": "disabled() ? undefined : 0",
  },
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../../scss/commons/variables";
      @use "../../../../scss/commons/mixins";

      sd-anchor {
        display: inline-block;
        cursor: pointer;

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            color: var(--theme-#{$key}-default);

            &:hover {
              color: var(--theme-#{$key}-darker);
              text-decoration: underline;
            }

            &:active {
              color: var(--theme-#{$key}-default);
            }

            @media all and (pointer: coarse) {
              &:hover {
                color: var(--theme-#{$key}-default);
                text-decoration: none;
              }
            }
          }
        }

        &[data-sd-disabled="true"] {
          opacity: 0.3;
          pointer-events: none;
        }
      }
    `,
  ],
})
export class SdAnchorControl {
  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });

  /** 테마 - 컴포넌트의 색상 테마를 설정 */
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >("primary");
}
