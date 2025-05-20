import { contentChild, Directive, input, TemplateRef } from "@angular/core";

@Directive({
  selector: "sd-data-sheet-filter",
  standalone: true,
})
export class SdDataSheetFilterDirective {
  label = input<string>();
  labelTooltip = input<string>();

  labelTemplateRef = contentChild<any, TemplateRef<void>>("label", { read: TemplateRef });
  contentTemplateRef = contentChild.required<any, TemplateRef<void>>("content", { read: TemplateRef });
}