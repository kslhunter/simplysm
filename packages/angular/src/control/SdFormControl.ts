import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Injector, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`
})
export class SdFormControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        &[sd-inline=true] {
          display: inline-block;
          overflow: hidden;
          vertical-align: middle;

          > form {
            display: inline-block;
            margin-bottom: -${vars.gap.sm};

            > sd-form-item {
              display: inline-block;
              margin-bottom: ${vars.gap.sm};
              margin-right: ${vars.gap.default};

              &:last-child {
                margin-right: 0;
              }

              > label {
                display: inline-block;
                vertical-align: middle;
                margin-right: ${vars.gap.sm};
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
      }`;
  }

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Output()
  public readonly submit = new EventEmitter<void>();

  public constructor(injector: Injector) {
    super(injector);
  }

  public onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit.emit();
  }
}