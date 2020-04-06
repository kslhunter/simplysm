import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  TemplateRef
} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";
import {SdFormControl} from "./SdFormControl";

@Component({
  selector: "sd-form-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.hidden]="!label && !labelTemplateRef"
           [style.width]="labelWidth">
      <ng-container *ngIf="!labelTemplateRef">{{ label }}</ng-container>
      <ng-container *ngIf="labelTemplateRef">
        <ng-template [ngTemplateOutlet]="labelTemplateRef"
                     [ngTemplateOutletContext]="{label: label}"></ng-template>
      </ng-container>
    </label>
    <div class="_content">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    :host {
      > label {
        font-weight: bold;
      }

      &[sd-layout="cascade"] {
        display: block;
        margin-bottom: var(--gap-default);

        > label {
          display: block;
          margin-bottom: var(--gap-sm);
        }

        > ._content {
          display: block;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }

      &[sd-layout="table"] {
        display: table-row;

        > label {
          display: table-cell;
          padding-bottom: var(--gap-sm);
          padding-left: var(--gap-default);
          padding-right: var(--gap-default);
          text-align: right;
        }

        > ._content {
          display: table-cell;
          padding-bottom: var(--gap-sm);
        }

        &:last-child {
          > label {
            padding-bottom: 0;
          }

          > ._content {
            padding-bottom: 0;
          }
        }
      }

      &[sd-layout="inline"] {
        display: inline-block;
        vertical-align: top;
        margin-right: var(--gap-default);

        > label {
          display: inline-block;
          vertical-align: middle;
          margin-right: var(--gap-sm);
        }

        > ._content {
          display: inline-block;
          vertical-align: middle;
        }

        &:last-child {
          margin-right: 0;
        }
      }
    }
  `]
})
export class SdFormItemControl {
  @Input()
  @SdInputValidate(String)
  public label?: string;

  @ContentChild("label", {static: true})
  public labelTemplateRef?: TemplateRef<{ label?: string }>;

  @HostBinding("attr.sd-layout")
  public get layout(): "cascade" | "inline" | "table" | undefined {
    return this.parentControl?.layout;
  }

  public get labelWidth(): string | undefined {
    return this.layout === "table" ? this.parentControl?.labelWidth : undefined;
  }

  public constructor(@Inject(forwardRef(() => SdFormControl))
                     public readonly parentControl?: SdFormControl) {
  }
}
