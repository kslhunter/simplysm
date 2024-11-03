import { Directive, inject, input, TemplateRef } from "@angular/core";

@Directive({
  selector: "ng-template[sd-sheet-view-filter]",
  standalone: true,
})
export class SdSheetViewFilterDirective {
  label = input<string>();
  templateRef = inject(TemplateRef);
}
