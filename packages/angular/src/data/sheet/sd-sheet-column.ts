import {
  booleanAttribute,
  contentChild,
  Directive,
  input,
  TemplateRef,
} from "@angular/core";

export interface SdSheetCellContext {
  $implicit: unknown;
  item: unknown;
  index: number;
  depth: number;
  edit: boolean;
}

@Directive({
  selector: "sd-sheet-column",
  standalone: true,
})
export class SdSheetColumn {
  key = input.required<string>();
  header = input<string | string[]>("");
  width = input<string>();
  fixed = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
  collapse = input(false, { transform: booleanAttribute });
  disableSorting = input(false, { transform: booleanAttribute });
  disableResizing = input(false, { transform: booleanAttribute });
  ordering = input(0);

  cellTplRef = contentChild<TemplateRef<SdSheetCellContext>>("cellTpl");
  summaryTplRef = contentChild<TemplateRef<void>>("summaryTpl");
}
