import { contentChild, Directive, TemplateRef } from "@angular/core";

@Directive({
  selector: "sd-data-sheet-tool",
  standalone: true,
})
export class SdDataSheetToolDirective {
  /*theme = input<
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "grey"
    | "blue-grey"
    | "link"
    | "link-primary"
    | "link-secondary"
    | "link-info"
    | "link-success"
    | "link-warning"
    | "link-danger"
    | "link-grey"
    | "link-blue-grey"
  >();
  disabled = input(false, { transform: transformBoolean });

  buttonStyle = input<string>();
  buttonClass = input<string>();*/

  contentTemplateRef = contentChild.required<any, TemplateRef<void>>("content", {
    read: TemplateRef,
  });
}
