import {ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef} from "@angular/core";
import {Uuid} from "../../../common/types/Uuid";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

@Component({
  selector: "sd-sheet-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
    }
  `]
})
export class SdSheetColumnControl {
  public guid = new Uuid().toString();

  @Input()
  @SdTypeValidate(String)
  public headerText?: string;

  @Input()
  @SdTypeValidate({
    type: Number,
    notnull: true
  })
  public width = 120;

  @Input()
  @SdTypeValidate(Boolean)
  public fixed?: boolean;

  @ContentChild("item")
  public itemTemplateRef?: TemplateRef<any>;
}