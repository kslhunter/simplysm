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
import {SdInputValidate} from "../../utils/SdInputValidate";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdCheckboxGroupControl {
  @Input()
  @SdInputValidate({type: Array, notnull: true})
  value: any[] = [];

  @Output()
  valueChange = new EventEmitter<any[]>();

  @Input()
  @SdInputValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input()
  @SdInputValidate(String)
  keyProp?: string;

  @ContentChildren(SdCheckboxGroupControl, {descendants: true})
  itemControls?: QueryList<SdCheckboxGroupControl>;

  getIsItemSelected(value: any): boolean {
    const thisKeys = (this.keyProp !== undefined) ? this.value?.map((item) => item[this.keyProp!]) : this.value;
    const itemKey = (this.keyProp !== undefined) ? value?.[this.keyProp] : value;
    return thisKeys?.includes(itemKey) ?? false;
  }

  toggleValueItem(item: any): void {
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
