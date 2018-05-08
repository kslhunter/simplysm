import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {DateOnly} from "@simplism/sd-core";
import {SdSizeString} from "../commons/types";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-date-picker",
  template: `
    <sd-textfield [type]="type"
                  [value]="value"
                  [disabled]="disabled"
                  [size]="size"
                  [required]="required"
                  (valueChange)="onValueChange($event)">
    </sd-textfield>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdDatePickerControl}]
})
export class SdDatePickerControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["date", "month", "year"].includes(value),
    notnull: true
  })
  public type: "date" | "month" | "year" = "date";

  @Input()
  @SdTypeValidate(DateOnly)
  public value?: DateOnly;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate("SdSizeString")
  public size?: SdSizeString;

  @Output()
  public readonly valueChange = new EventEmitter<DateOnly | undefined>();

  public onValueChange(value: any): void {
    this.value = DateOnly.parse(value);
    this.valueChange.emit(value);
  }
}
