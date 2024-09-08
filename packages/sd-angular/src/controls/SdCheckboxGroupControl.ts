import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from "@angular/core";
import { coercionBoolean } from "../utils/commons";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content> `,
})
export class SdCheckboxGroupControl<T> {
  @Input() value: T[] = [];
  @Output() valueChange = new EventEmitter<T[]>();
  @Input({ transform: coercionBoolean }) disabled = false;
}
