import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  EventEmitter,
  HostBinding,
  inject,
  Input,
  Output,
  QueryList
} from "@angular/core";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {SdDoCheckHelper} from "../../utils/SdDoCheckHelper";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdCheckboxGroupControl implements DoCheck {
  private _cdr = inject(ChangeDetectorRef);

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

  private _prevData: Record<string, any> = {};

  ngDoCheck(): void {
    const $ = new SdDoCheckHelper(this._prevData);

    $.run({value: [this.value, "one"]}, () => {
      this._cdr.markForCheck();
    });

    Object.assign(this._prevData, $.changeData);
  }

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
