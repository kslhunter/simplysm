import { contentChild, Directive, input, TemplateRef } from "@angular/core";
import {
  SdSheetColumnCellTemplateContext,
  SdSheetColumnCellTemplateDirective,
} from "../directives/SdSheetColumnCellTemplateDirective";

@Directive({
  selector: "sd-sheet-view-column",
  standalone: true,
})
export class SdSheetViewColumnDirective {
  key = input.required<string>();
  header = input<string | string[]>();
  fixed = input(false);
  cellTemplateRef = contentChild.required<any, TemplateRef<SdSheetColumnCellTemplateContext<any>>>(
    SdSheetColumnCellTemplateDirective,
    {
      read: TemplateRef,
    },
  );
}
