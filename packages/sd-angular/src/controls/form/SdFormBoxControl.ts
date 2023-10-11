import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../../utils/SdInputValidate";

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
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: ["cascade", "inline", "table", "none"]
  })
  @HostBinding("attr.sd-layout")
  public layout: "cascade" | "inline" | "table" | "none" = "cascade";

  @Input()
  @SdInputValidate(String)
  public labelWidth?: string;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["left", "right", "center"]
  })
  public labelAlign: "left" | "right" | "center" | undefined;
}
