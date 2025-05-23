import { contentChild, Directive, input, TemplateRef } from "@angular/core";
import {
  SdSheetColumnCellTemplateContext,
  SdSheetColumnCellTemplateDirective,
} from "./sd-sheet-column-cell.template-directive";
import { transformBoolean } from "../../../utils/type-tramsforms";

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

  cellTemplateRef = contentChild.required<any, TemplateRef<SdSheetColumnCellTemplateContext<T>>>(
    SdSheetColumnCellTemplateDirective,
    {
      read: TemplateRef,
    },
  );
  headerTemplateRef = contentChild<any, TemplateRef<void>>("header", { read: TemplateRef });
  summaryTemplateRef = contentChild<any, TemplateRef<void>>("summary", { read: TemplateRef });
}
