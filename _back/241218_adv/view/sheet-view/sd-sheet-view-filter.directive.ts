import { contentChild, Directive, input, TemplateRef } from "@angular/core";

@Directive({
  selector: "sd-sheet-view-filter",
  standalone: true,
})
export class SdSheetViewFilterDirective {
  label = input<string>();
  labelTooltip = input<string>();

  labelTemplateRef = contentChild<any, TemplateRef<void>>("label", { read: TemplateRef });
  contentTemplateRef = contentChild.required<any, TemplateRef<void>>(
    "content",
    { read: TemplateRef },
  );
}