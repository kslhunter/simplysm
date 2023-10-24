import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  QueryList
} from "@angular/core";
import {coercionBoolean} from "../../utils/commons";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdCheckboxGroupControl<T> {
  @Input()
  value: T[] = [];

  @Output()
  valueChange = new EventEmitter<T[]>();

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input()
  keyProp?: string;

  @ContentChildren(SdCheckboxGroupControl, {descendants: true})
  itemControls?: QueryList<SdCheckboxGroupControl<T>>;

  getIsItemSelected(value: T): boolean {
    const thisKeys = (this.keyProp !== undefined) ? this.value?.map((item) => item[this.keyProp!]) : this.value;
    const itemKey = (this.keyProp !== undefined) ? value?.[this.keyProp] : value;
    return thisKeys?.includes(itemKey) ?? false;
  }

  toggleValueItem(item: T) {
    const newValues = [...this.value];

    const isSelected = this.getIsItemSelected(item);
    if (isSelected) {
      newValues.remove(item);
    }
    else {
      newValues.push(item);
    }

    if (this.valueChange.observed) {
      this.valueChange.emit(newValues);
    }
    else {
      this.value = newValues;
    }
  }
}
