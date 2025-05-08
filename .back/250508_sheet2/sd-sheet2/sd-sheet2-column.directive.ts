import { contentChild, Directive, input, TemplateRef } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";
import {
  SdSheet2ColumnCellTemplateContext,
  SdSheet2ColumnCellTemplateDirective,
} from "./sd-sheet2-column-cell.template-directive";

@Directive({
  selector: "sd-sheet2-column",
  standalone: true,
})
export class SdSheet2ColumnDirective<T> {
  key = input.required<string>();
  fixed = input(false, { transform: transformBoolean });
  header = input<string | string[]>();
  width = input<string>();
  /** 숨김 (config에 저장됨) */
  hidden = input(false, { transform: transformBoolean });
  /** 접기 (config에 저장되지 않음) */
  collapse = input(false, { transform: transformBoolean });

  cellTemplateRef = contentChild<any, TemplateRef<SdSheet2ColumnCellTemplateContext<T>>>(
    SdSheet2ColumnCellTemplateDirective,
    { read: TemplateRef },
  );
}
