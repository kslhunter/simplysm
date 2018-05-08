import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdSizeString, SdThemeString} from "../commons/types";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-note",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdNoteControl}]
})
export class SdNoteControl extends SdComponentBase {
  @Input()
  @SdTypeValidate("SdSizeString")
  @HostBinding("attr.sd-size")
  public size?: SdSizeString;

  @Input()
  @SdTypeValidate("SdThemeString")
  @HostBinding("attr.sd-theme")
  public theme?: SdThemeString;
}
