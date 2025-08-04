import { contentChild, Directive, input, TemplateRef } from "@angular/core";

/** @deprecated */
@Directive({
  selector: "sd-data-sheet-note",
  standalone: true,
})
export class SdDataSheetNoteDirective {
  theme = input.required<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  contentTemplateRef = contentChild.required<any, TemplateRef<void>>("content", { read: TemplateRef });
}
