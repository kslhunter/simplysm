import {ContentChild, Directive, Input, TemplateRef} from "@angular/core";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {Uuid} from "@simplysm/sd-core-common";
import {
  SdSheetColumnCellTemplateContext,
  SdSheetColumnCellTemplateDirective
} from "./SdSheetColumnCellTemplateDirective";

/*@Component({
  selector: "sd-sheet-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ""
})*/
@Directive({
  selector: "sd-sheet-column"
})
export class SdSheetColumnDirective<T> {
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
  public headerStyle?: string;

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

  @ContentChild(SdSheetColumnCellTemplateDirective, {read: TemplateRef})
  public cellTemplateRef?: TemplateRef<SdSheetColumnCellTemplateContext<T>>;

  @ContentChild("header", {static: true})
  public headerTemplateRef?: TemplateRef<void>;

  @ContentChild("summary", {static: true})
  public summaryTemplateRef?: TemplateRef<void>;
}
