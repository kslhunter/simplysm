import { Directive, input } from "@angular/core";
import { SdSheetColumnDirective } from "../../controls/sheet/directives/SdSheetColumnDirective";
import { transformBoolean } from "../../utils/transforms/tramsformBoolean";

@Directive({
  selector: "sd-data-sheet-column",
  standalone: true,
})
export class SdDataSheetColumnDirective<T> extends SdSheetColumnDirective<T> {
  edit = input(false, { transform: transformBoolean });
}
