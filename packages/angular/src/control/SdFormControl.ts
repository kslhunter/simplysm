import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";


@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`
})
export class SdFormControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Output()
  public readonly submit = new EventEmitter<void>();


  public onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit.emit();
  }
}