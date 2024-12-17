import { Directive, inject, input, TemplateRef } from "@angular/core";

@Directive({
  selector: "ng-template[target]",
  standalone: true,
})
export class TemplateTargetDirective {
  templateRef = inject(TemplateRef);

  target = input.required<string>();
}