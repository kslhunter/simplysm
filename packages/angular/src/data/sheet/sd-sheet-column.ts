import {
  booleanAttribute,
  contentChild,
  Directive,
  input,
  TemplateRef,
} from "@angular/core";
import { SdSheetColumnCellTemplate } from "./sd-sheet-column-cell-template";

export interface SdSheetCellContext<T = unknown> {
  $implicit: T;
  item: T;
  index: number;
  depth: number;
  edit: boolean;
}

@Directive({
  selector: "sd-sheet-column",
  standalone: true,
})
export class SdSheetColumn<T = unknown> {
  key = input.required<string>();
  header = input<string | string[]>("");
  headerStyle = input<string>();
  tooltip = input<string>();
  width = input<string>();
  fixed = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
  collapse = input(false, { transform: booleanAttribute });
  disableSorting = input(false, { transform: booleanAttribute });
  disableResizing = input(false, { transform: booleanAttribute });
  ordering = input(0);

  cellTplRef = contentChild.required<SdSheetColumnCellTemplate<T>, TemplateRef<SdSheetCellContext<T>>>(
    SdSheetColumnCellTemplate,
    { read: TemplateRef },
  );
  headerTplRef = contentChild<TemplateRef<void>>("headerTpl");
  summaryTplRef = contentChild<TemplateRef<void>>("summaryTpl");
}
