import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      &[sd-inline=true] > form {
        /deep/ > sd-form-item {
          display: inline-block;
          margin-bottom: 0;
          margin-right: gap(sm);
          &:last-child {
            margin-right: 0;
          }

          > label {
            display: inline-block;
            margin-right: gap(sm);
          }
          > div {
            display: inline-block;
          }
        }
      }
    }
  `]
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