import {ContentChild, Directive, Input, TemplateRef} from "@angular/core";
import {
  SdSheetColumnCellTemplateContext,
  SdSheetColumnCellTemplateDirective
} from "./SdSheetColumnCellTemplateDirective";
import {coercionBoolean} from "../utils/commons";

@Directive({
  selector: "sd-sheet-column",
  standalone: true
})
export class SdSheetColumnDirective<T> {
  @Input({required: true}) key!: string;
  @Input({transform: coercionBoolean}) fixed = false;
  @Input() header?: string | string[];
  @Input() headerStyle?: string;
  @Input() tooltip?: string;
  @Input() width?: string;
  @Input({transform: coercionBoolean}) useOrdering = false;
  @Input({transform: coercionBoolean}) resizable = false;
  @Input({transform: coercionBoolean}) hidden = false;
  @Input({transform: coercionBoolean}) collapse = false;

  @ContentChild(SdSheetColumnCellTemplateDirective, {read: TemplateRef}) cellTemplateRef?: TemplateRef<SdSheetColumnCellTemplateContext<T>>;
  @ContentChild("header", {static: true}) headerTemplateRef?: TemplateRef<void>;
  @ContentChild("summary", {static: true}) summaryTemplateRef?: TemplateRef<void>;
}
