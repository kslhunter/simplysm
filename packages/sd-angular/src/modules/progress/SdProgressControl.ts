import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-progress",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_sd-progress-content">
      {{ label || "&nbsp;" }}
    </div>
      <ng-content></ng-content>
  `,
  styles: [/* language=SCSS */ `
    sd-progress {
      position: relative;
      display: block;
      width: 100%;
      white-space: nowrap;
      background: var(--theme-grey-lighter);

      border-radius: 2px;
      overflow: hidden;

      > ._sd-progress-content {
        font-weight: bold;
        font-size: 13pt;
        background: white;
        padding: var(--gap-lg) var(--gap-default);
      }
    }
  `]
})
export class SdProgressControl {
  @Input()
  public label?: string;
}