import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "sd-progress",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_sd-progress-content">
      {{ label || "&nbsp;" }}
    </div>
    <ng-content></ng-content>
  `,
  styles: [/* language=SCSS */ `
    :host {
      position: relative;
      display: block;
      width: 100%;
      white-space: nowrap;
      background: white;
      background: var(--theme-color-grey-lighter);
      border-radius: 2px;
      overflow: hidden;

      > ._sd-progress-content {
        font-weight: bold;
        font-size: 13pt;
        background: white;
        padding: var(--gap-lg) var(--gap-default);
      }

      &._size-lg {
        > ._sd-progress-content,
        /deep/ > sd-progress-item > div {
          padding: var(--gap-default) var(--gap-lg);
          font-size: large;
        }
      }
    }
  `]
})
export class SdProgressControl {
  @Input()
  public label?: string;

  @Input()
  public maxValue?: number;
}
