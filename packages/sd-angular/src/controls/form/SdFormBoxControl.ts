import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";

@Component({
  selector: "sd-form-box",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      &[sd-layout="cascade"] {
        display: flex;
        flex-direction: column;
        gap: var(--gap-sm);
      }

      &[sd-layout="table"] {
        display: table;
        width: 100%;
      }

      &[sd-layout="inline"] {
        display: inline-flex;
        flex-wrap: wrap;
        gap: var(--gap-sm);
      }

      &[sd-layout="none"] {
        display: contents;
      }
    }
  `]
})
export class SdFormBoxControl {
  @Input()
  @HostBinding("attr.sd-layout")
  layout: "cascade" | "inline" | "table" | "none" = "cascade";

  @Input()
  labelWidth?: string;

  @Input()
  labelAlign?: "left" | "right" | "center";
}
