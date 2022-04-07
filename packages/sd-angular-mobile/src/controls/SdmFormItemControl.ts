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
import { SdmFormControl } from "./SdmFormControl";
import { SdInputValidate } from "@simplysm/sd-angular";

@Component({
  selector: "sdm-form-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.unvisible]="!label && !labelTemplateRef">
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
        font-size: small;
        font-weight: bold;
      }

      &[sd-layout="cascade"] {
        display: block;
        margin-bottom: var(--gap-default);

        > label {
          display: block;
        }
      }

      &[sd-layout="table"] {
        display: table-row;

        > label {
          display: table-cell;
          vertical-align: middle;
        }

        > ._content {
          display: table-cell;
          vertical-align: middle;
          text-align: right;
        }
      }
    }
  `]
})
export class SdmFormItemControl {
  @Input()
  @SdInputValidate(String)
  public label?: string;

  @ContentChild("label", { static: true })
  public labelTemplateRef?: TemplateRef<{ label?: string }>;

  @HostBinding("attr.sd-layout")
  public get layout(): "cascade" | "table" {
    return this._parentFormControl.layout;
  }

  public constructor(@Inject(forwardRef(() => SdmFormControl))
                     private readonly _parentFormControl: SdmFormControl) {
  }
}

