import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../common/SdTypeValidate";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`
})
export class SdFormControl {
  @Output()
  public readonly submit = new EventEmitter<void>();

  public onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit.emit();
  }
}


@Component({
  selector: "sd-form-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="_label">{{ label }}</label>
    <div class="_content">
      <ng-content></ng-content>
    </div>`
})
export class SdFormItemControl {
  @Input()
  @SdTypeValidate(String)
  public label?: string;
}
