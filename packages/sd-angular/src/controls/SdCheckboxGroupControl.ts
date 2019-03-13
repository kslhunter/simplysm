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
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdCheckboxGroupControl implements DoCheck {
  @Input()
  @SdTypeValidate(Array)
  public value?: any[];

  @Output()
  public readonly valueChange = new EventEmitter<any[]>();

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(String)
  public keyProp?: string;

  @ContentChildren(SdCheckboxGroupControl, {descendants: true})
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
    const thisKeyValue = (this.keyProp && this.value) ? this.value.map(item => item[this.keyProp!]) : this.value;
    const itemKeyValue = (this.keyProp && value) ? value[this.keyProp] : value;
    return !!thisKeyValue && thisKeyValue.includes(itemKeyValue);
  }

  public toggleValueItem(item: any): void {
    if (!this.value) this.value = [];

    const isSelected = this.getIsItemSelected(item);
    if (isSelected) {
      this.value.remove(item);
    } else {
      this.value.push(item);
    }
    this.valueChange.emit(this.value);
  }
}
