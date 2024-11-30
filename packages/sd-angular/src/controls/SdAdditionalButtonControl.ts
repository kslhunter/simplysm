import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

@Component({
  selector: "sd-additional-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div>
      <ng-content />
    </div>
    <ng-content select="sd-button" />
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-additional-button {
        display: flex;
        flex-wrap: nowrap;
        flex-direction: row;
        gap: var(--gap-sm);
        border: 1px solid var(--trans-light);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > div {
          flex-grow: 1;
          overflow: auto;
          padding: var(--gap-sm) var(--gap-default);
        }

        > sd-button > button {
          border-left: 1px solid var(--trans-light) !important;
          padding: var(--gap-sm) !important;
        }

        &[sd-inset="true"] {
          border-radius: 0;
          border: none;
        }

        &[sd-size="sm"] {
          > div {
            padding: var(--gap-xs) var(--gap-default);
          }

          > sd-button > button {
            padding: var(--gap-xs) !important;
          }
        }

        &[sd-size="lg"] {
          > div {
            padding: var(--gap-default) var(--gap-xl);
          }

          > sd-button > button {
            padding: var(--gap-default) !important;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-size]": "size()",
    "[attr.sd-inset]": "inset()",
  },
})
export class SdAdditionalButtonControl {
  /** 컨트롤의 크기 ("sm" | "lg") */
  size = input<"sm" | "lg">();

  /** 내부 삽입 모드 여부 (기본값: false) */
  inset = input(false, { transform: transformBoolean });
}
