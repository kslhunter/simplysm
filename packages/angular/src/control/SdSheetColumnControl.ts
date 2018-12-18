import {ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {Uuid} from "@simplism/core";


@Component({
  selector: "sd-sheet-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``
})
export class SdSheetColumnControl {


  public guid = Uuid.newUuid().toString();

  @Input()
  @SdTypeValidate(String)
  public header?: string;

  @Input()
  @SdTypeValidate(String)
  public help?: string;

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