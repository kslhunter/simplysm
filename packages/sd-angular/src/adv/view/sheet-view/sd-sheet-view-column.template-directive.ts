import { Directive, inject, input, TemplateRef } from "@angular/core";

@Directive({
  selector: "ng-template[sd-sheet-view-column]",
  standalone: true,
})
export class SdSheetViewColumnTemplateDirective {
  templateRef = inject(TemplateRef);

  key = input.required<string>();

  header = input<string | string[]>();
}