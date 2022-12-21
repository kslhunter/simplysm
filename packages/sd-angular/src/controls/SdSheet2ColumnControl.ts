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
  @SdInputValidate(String)
  public key?: string;

  @Input()
  @SdInputValidate(Boolean)
  public fixed?: boolean;

  @Input()
  @SdInputValidate([String, Array])
  public header?: string | string[];

  @Input()
  @SdInputValidate(String)
  public tooltip?: string;

  @Input()
  @SdInputValidate(String)
  public width?: string;

  @Input()
  @SdInputValidate(Boolean)
  public useOrdering?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public resizable?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public hidden?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public collapse?: boolean;

  @ContentChild("cell", { static: true })
  public cellTemplateRef?: TemplateRef<{ item: T; index: number; depth: number; edit: boolean }>;

  @ContentChild("header", { static: true })
  public headerTemplateRef?: TemplateRef<undefined>;

  @ContentChild("summary", { static: true })
  public summaryTemplateRef?: TemplateRef<undefined>;
}
