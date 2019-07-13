import {ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {Uuid} from "@simplysm/sd-core";

@Component({
  selector: "sd-sheet-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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

  @ContentChild("cell", {static: true})
  public cellTemplateRef?: TemplateRef<{ item: any; index: number }>;

  @ContentChild("head", {static: true})
  public headTemplateRef?: TemplateRef<{ item: any; index: number }>;

  @ContentChild("summary", {static: true})
  public summaryTemplateRef?: TemplateRef<{ items: any[] }>;
}
