import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
})
export class SdCheckboxGroup<T> {
  value = model<T[]>([]);

  disabled = input(false, { transform: booleanAttribute });
}
