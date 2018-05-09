import {ChangeDetectionStrategy, Component, HostBinding, Input, OnChanges, SimpleChanges} from "@angular/core";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {SdSizeString, SdThemeString} from "../helpers/types";

@Component({
  selector: "sd-button2",
  template: `
    <button [ngClass]="classList"
            [type]="type"
            [disabled]="disabled">
      <ng-content></ng-content>
    </button>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdButton2Control implements OnChanges {
  // Input/Output
  @Input() public type?: "button" | "submit";
  @Input() public disabled?: boolean;

  @HostBinding("attr.sd-size")
  @Input() public size?: SdSizeString;

  @HostBinding("attr.sd-theme")
  @Input() public theme?: SdThemeString;

  @HostBinding("attr.sd-inline")
  @Input() public inline?: boolean;

  @HostBinding("attr.sd-inset")
  @Input() public inset?: boolean;

  public ngOnChanges(changes: SimpleChanges): void {
    SimgularHelpers.typeValidate(changes, {
      type: {
        type: String,
        validator: value => ["button", "submit"].includes(value)
      },
      size: "SdSizeString",
      theme: "SdThemeString",
      inline: Boolean,
      disabled: Boolean
    });
  }
}
