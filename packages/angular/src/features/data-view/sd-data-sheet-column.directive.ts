import { booleanAttribute, Directive, input } from "@angular/core";
import { SdSheetColumnDirective } from "../../ui/data/sheet/sd-sheet-column.directive";

@Directive({
  selector: "sd-data-sheet-column",
  standalone: true,
})
export class SdDataSheetColumnDirective extends SdSheetColumnDirective {
  edit = input(false, { transform: booleanAttribute });
}
