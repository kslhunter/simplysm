import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-progress",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-progress {
        position: relative;
        display: block;
        width: 100%;
        white-space: nowrap;
        background: var(--background-color);
        background: var(--theme-grey-lighter);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > ._sd-progress-content {
          font-weight: bold;
          font-size: 13pt;
          background: var(--background-color);
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
  template: `
    <div class="_sd-progress-content">
      {{ label() || "&nbsp;" }}
    </div>
    <ng-content></ng-content>
  `,
})
export class SdProgressControl {
  label = input<string>();
  maxValue = input<number>();
}
