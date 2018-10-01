import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

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
      &[sd-inline=true] {
        display: inline-block;
        overflow: hidden;
        vertical-align: middle;

        > form {
          display: inline-block;
          margin-bottom: - gap(sm);

          /deep/ > sd-form-item {
            display: inline-block;
            margin-bottom: gap(sm);
            margin-right: gap(default);

            &:last-child {
              margin-right: 0;
            }

            > label {
              display: inline-block;
              vertical-align: middle;
              margin-right: gap(sm);
              margin-bottom: 0;
            }
            > div {
              display: inline-block;
              vertical-align: middle;

              > sd-checkbox > label {
                display: inline-block;
                width: auto;
              }
            }
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