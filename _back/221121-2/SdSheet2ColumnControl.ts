import { ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { Uuid } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-sheet2-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ""
})
export class SdSheet2ColumnControl<T> {
  public guid = Uuid.new().toString();

  @Input()
  @SdInputValidate(Boolean)
  public fixed?: boolean;

  @Input()
  @SdInputValidate([String, Array])
  public header?: string | string[];

  @ContentChild("cell", { static: true })
  public cellTemplateRef?: TemplateRef<{ item: T }>;

  @ContentChild("header", { static: true })
  public headerTemplateRef?: TemplateRef<{}>;
}
