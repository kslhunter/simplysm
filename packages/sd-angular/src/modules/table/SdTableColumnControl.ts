import {ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {Uuid} from "@simplysm/sd-core";

@Component({
  selector: "sd-table-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ``
})
export class SdTableColumnControl {
  public guid = Uuid.newUuid().toString();

  @Input()
  @SdTypeValidate(String)
  public header?: string;

  @Input()
  @SdTypeValidate(String)
  public headerTitle?: string;

  @Input("width.%")
  @SdTypeValidate(Number)
  public widthPercent?: number;

  @ContentChild("content", {static: true})
  public contentTemplateRef?: TemplateRef<{ item: any; index: number }>;

  @ContentChild("header", {static: true})
  public headerTemplateRef?: TemplateRef<{ item: any; index: number }>;
}
