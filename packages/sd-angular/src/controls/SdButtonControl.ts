import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdSizeString, SdThemeString} from "../commons/types";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-button2",
  template: `
    <button [ngClass]="classList"
            [type]="type"
            [disabled]="disabled">
      <ng-content></ng-content>
    </button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdButtonControl}]
})
export class SdButtonControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["button", "submit"].includes(value),
    notnull: true
  })
  public type: "button" | "submit" = "button";

  @Input()
  @SdTypeValidate("SdSizeString")
  @HostBinding("attr.sd-size")
  public size?: SdSizeString;

  @Input()
  @SdTypeValidate("SdThemeString")
  @HostBinding("attr.sd-theme")
  public theme?: SdThemeString;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;
}
