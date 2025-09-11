import { contentChild, Directive, input, TemplateRef } from "@angular/core";
import {
  SdSheetColumnCellTemplateContext,
  SdSheetColumnCellTemplateDirective,
} from "./SdSheetColumnCellTemplateDirective";
import { transformBoolean } from "../../../utils/transforms/tramsformBoolean";

@Directive({
  selector: "sd-sheet-column",
  standalone: true,
})
export class SdSheetColumnDirective<T> {
  key = input.required<string>();
  fixed = input(false, { transform: transformBoolean });
  header = input<string | string[]>();
  headerStyle = input<string>();
  tooltip = input<string>();
  width = input<string>();
  disableSorting = input(false, { transform: transformBoolean });
  disableResizing = input(false, { transform: transformBoolean });
  hidden = input(false, { transform: transformBoolean });
  collapse = input(false, { transform: transformBoolean });

  cellTplRef = contentChild.required<any, TemplateRef<SdSheetColumnCellTemplateContext<T>>>(
    SdSheetColumnCellTemplateDirective,
    { read: TemplateRef },
  );
  headerTplRef = contentChild<any, TemplateRef<void>>("headerTpl", { read: TemplateRef });
  summaryTplRef = contentChild<any, TemplateRef<void>>("summaryTpl", { read: TemplateRef });
}
