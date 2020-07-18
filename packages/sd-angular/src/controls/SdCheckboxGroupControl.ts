import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  EventEmitter,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  Output,
  QueryList
} from "@angular/core";
import { SdInputValidate } from "../commons/SdInputValidate";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdCheckboxGroupControl implements DoCheck {
  @Input()
  @SdInputValidate(Array)
  public value?: any[];

  @Output()
  public readonly valueChange = new EventEmitter<any[]>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate(String)
  public keyProp?: string;

  @ContentChildren(SdCheckboxGroupControl, { descendants: true })
  public itemControls?: QueryList<SdCheckboxGroupControl>;

  private readonly _iterableDiffer: IterableDiffer<any>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((index, item) => item);
  }

  public ngDoCheck(): void {
    if (this.value && this._iterableDiffer.diff(this.value)) {
      this._cdr.markForCheck();
    }
  }

  public getIsItemSelected(value: any): boolean {
    const thisKeyValue = (this.keyProp !== undefined && this.value) ? this.value.map(item => item[this.keyProp!]) : this.value;
    const itemKeyValue = (this.keyProp !== undefined && value !== undefined) ? value[this.keyProp] : value;
    return thisKeyValue?.includes(itemKeyValue) ?? false;
  }

  public toggleValueItem(item: any): void {
    if (!this.value) this.value = [];

    const isSelected = this.getIsItemSelected(item);
    if (isSelected) {
      this.value.remove(item);
    }
    else {
      this.value.push(item);
    }
    this.valueChange.emit(this.value);
  }
}
