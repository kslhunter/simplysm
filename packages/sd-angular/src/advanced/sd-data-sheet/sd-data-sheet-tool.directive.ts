import { contentChild, Directive, input, TemplateRef } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";

@Directive({
  selector: "sd-data-sheet-tool",
  standalone: true,
})
export class SdDataSheetToolDirective {
  prepend = input(false, { transform: transformBoolean });
  fill = input(false, { transform: transformBoolean });

  contentTemplateRef = contentChild.required<any, TemplateRef<void>>("content", {
    read: TemplateRef,
  });
}
