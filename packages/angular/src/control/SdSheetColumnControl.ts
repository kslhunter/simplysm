import {ChangeDetectionStrategy, Component, ContentChild, Injector, Input, TemplateRef} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {Uuid} from "@simplism/core";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-sheet-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``
})
export class SdSheetColumnControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ ``;
  }

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


  public constructor(injector: Injector) {
    super(injector);
  }
}