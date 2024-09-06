import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from "@angular/core";
import { coercionNumber } from "../utils/commons";

@Component({
  selector: "sd-progress",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div class="_sd-progress-content">
      {{ label || "&nbsp;" }}
    </div>
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      sd-progress {
        position: relative;
        display: block;
        width: 100%;
        white-space: nowrap;
        background: white;
        background: var(--theme-grey-lighter);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > ._sd-progress-content {
          font-weight: bold;
          font-size: 13pt;
          background: white;
          padding: var(--gap-lg) var(--gap-default);
        }

        &._size-lg {
          > ._sd-progress-content,
          > sd-progress-item > div {
            padding: var(--gap-default) var(--gap-lg);
            font-size: large;
          }
        }
      }
    `,
  ],
})
export class SdProgressControl {
  @Input() label?: string;
  @Input({ transform: coercionNumber }) maxValue?: number;
}
