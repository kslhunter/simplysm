import { Directive, inject, input, TemplateRef } from "@angular/core";

@Directive({
  selector: "ng-template[sd-sheet-view-filter]",
  standalone: true,
})
export class SdSheetViewFilterTemplateDirective {
  templateRef = inject(TemplateRef);

  label = input<string>();
}