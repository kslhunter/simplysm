import {ContentChild, Directive, Input, TemplateRef} from "@angular/core";
import {
  SdSheetColumnCellTemplateContext,
  SdSheetColumnCellTemplateDirective
} from "./SdSheetColumnCellTemplateDirective";
import {coercionBoolean} from "../../utils/commons";

/*@Component({
  selector: "sd-sheet-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ""
})*/
@Directive({
  selector: "sd-sheet-column"
})
export class SdSheetColumnDirective<T> {
  @Input({required: true})
  key!: string;

  @Input({transform: coercionBoolean})
  fixed = false;

  @Input()
  header?: string | string[];

  @Input()
  headerStyle?: string;

  @Input()
  tooltip?: string;

  @Input()
  width?: string;

  @Input({transform: coercionBoolean})
  useOrdering = false;

  @Input({transform: coercionBoolean})
  resizable = false;

  @Input({transform: coercionBoolean})
  hidden = false;

  @Input({transform: coercionBoolean})
  collapse = false;

  @ContentChild(SdSheetColumnCellTemplateDirective, {read: TemplateRef})
  public cellTemplateRef?: TemplateRef<SdSheetColumnCellTemplateContext<T>>;

  @ContentChild("header", {static: true})
  public headerTemplateRef?: TemplateRef<void>;

  @ContentChild("summary", {static: true})
  public summaryTemplateRef?: TemplateRef<void>;
}
