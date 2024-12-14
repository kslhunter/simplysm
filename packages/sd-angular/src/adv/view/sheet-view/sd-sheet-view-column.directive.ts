import { Directive, input } from "@angular/core";
import { SdSheetColumnDirective } from "../../../controls/sheet/sd-sheet-column.directive";
import { transformBoolean } from "../../../utils/tramsforms";

@Directive({
  selector: "sd-sheet-view-column",
  standalone: true,
})
export class SdSheetViewColumnDirective extends SdSheetColumnDirective<any> {
  override useOrdering = input(true, { transform: transformBoolean });
  override resizable = input(true, { transform: transformBoolean });
}