import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdIconNames, sdIconRecord, TSdIconName } from "../../lib/sd-icon.commons";

@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``
})
export class SdIconControl extends FaIconComponent {
  @Input()
  @SdInputValidate({
    type: String,
    includes: sdIconNames
  })
  public set sdIcon(value: TSdIconName) {
    sdIconRecord[value]().then((icon) => {
      this.icon = icon;
      this.render();
    }).catch(() => {
    });
  };

  @Input()
  @SdInputValidate(Boolean)
  public override fixedWidth?: boolean;

  @Input("fw")
  @SdInputValidate(Boolean)
  public set fw(value: boolean | undefined) {
    this.fixedWidth = value;
  }

  public get fw(): boolean | undefined {
    return this.fixedWidth;
  }
}
