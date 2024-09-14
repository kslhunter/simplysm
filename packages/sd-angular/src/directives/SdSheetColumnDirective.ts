import { contentChild, Directive, input, TemplateRef } from "@angular/core";
import {
  SdSheetColumnCellTemplateContext,
  SdSheetColumnCellTemplateDirective,
} from "./SdSheetColumnCellTemplateDirective";

@Directive({
  selector: "sd-sheet-column",
  standalone: true,
})
export class SdSheetColumnDirective<T> {
  key = input.required<string>();
  fixed = input(false);
  header = input<string | string[]>();
  headerStyle = input<string>();
  tooltip = input<string>();
  width = input<string>();
  useOrdering = input(false);
  resizable = input(false);
  hidden = input(false);
  collapse = input(false);

  cellTemplateRef = contentChild<any, TemplateRef<SdSheetColumnCellTemplateContext<T>>>(
    SdSheetColumnCellTemplateDirective,
    {
      read: TemplateRef,
    },
  );
  headerTemplateRef = contentChild<any, TemplateRef<void>>("header", { read: TemplateRef });
  summaryTemplateRef = contentChild<any, TemplateRef<void>>("summary", { read: TemplateRef });
}
