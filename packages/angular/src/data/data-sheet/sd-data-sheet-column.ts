import { booleanAttribute, Directive, input } from "@angular/core";
import { SdSheetColumn } from "../sheet/sd-sheet-column";

@Directive({
  selector: "sd-data-sheet-column",
  standalone: true,
})
export class SdDataSheetColumn extends SdSheetColumn {
  edit = input(false, { transform: booleanAttribute });
}
