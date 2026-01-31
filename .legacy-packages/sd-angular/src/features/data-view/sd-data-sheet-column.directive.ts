import { Directive, input } from "@angular/core";
import { SdSheetColumnDirective } from "../../ui/data/sheet/directives/sd-sheet-column.directive";
import { transformBoolean } from "../../core/utils/transforms/transformBoolean";

@Directive({
  selector: "sd-data-sheet-column",
  standalone: true,
})
export class SdDataSheetColumnDirective<T> extends SdSheetColumnDirective<T> {
  edit = input(false, { transform: transformBoolean });
}
