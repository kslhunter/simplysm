import { Directive, input } from "@angular/core";
import {
  SdSheetColumnDirective,
} from "../../controls/sheet/directives/sd-sheet-column.directive";
import { transformBoolean } from "../../utils/type-tramsforms";

@Directive({
  selector: "sd-data-sheet-column",
  standalone: true,
})
export class SdDataSheetColumnDirective<T> extends SdSheetColumnDirective<T> {
  edit = input(false, { transform: transformBoolean });
}
