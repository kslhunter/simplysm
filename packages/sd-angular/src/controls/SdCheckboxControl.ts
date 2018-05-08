import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-checkbox",
  template: `
    <label tabindex="0">
      <input type="checkbox"
             [checked]="value"
             [disabled]="disabled"
             (change)="onInputChange($event)"/>
      <ng-content></ng-content>
    </label>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdCheckboxControl}]
})
export class SdCheckboxControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-checked")
  public value = false;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Output()
  public readonly valueChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  public onInputChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.value = element.checked;
    this.valueChange.emit(element.checked);
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (event.key === " ") {
      this.value = !this.value;
      this.valueChange.emit(this.value);
    }
  }
}
