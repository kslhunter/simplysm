import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`,
  styles: [/* language=SCSS */ `
    sd-form {
      display: block;
      overflow: hidden;

      > form {
        > * {
          margin-bottom: var(--gap-default);

          &:last-child {
            margin-bottom: 0;
          }
        }

        sd-form-item {
          display: block;
          margin-bottom: var(--gap-default);

          > label {
            display: block;
            font-weight: bold;
            margin-bottom: var(--gap-xs);
          }
        }
      }

      &[sd-inline=true] {
        vertical-align: middle;

        > form {
          display: inline-block;
          margin-bottom: calc(var(--gap-sm) * -1);

          sd-form-item {
            display: inline-block;
            margin-bottom: var(--gap-sm);
            margin-right: var(--gap-default);

            &:last-child {
              margin-right: 0;
            }

            > label {
              display: inline-block;
              vertical-align: middle;
              margin-right: var(--gap-sm);
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

          > * {
            margin-bottom: var(--gap-sm);
            margin-right: var(--gap-default);

            &:last-child {
              margin-right: 0;
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
