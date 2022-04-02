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
import { SdFormControl } from "./SdFormControl";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-form-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.unvisible]="!label && !labelTemplateRef"
           [style.width]="labelWidth"
           [hidden]="layout === 'none'"
           [style.text-align]="labelAlign">
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
        //margin-bottom: var(--gap-default);
        
        > label {
          display: block;
          margin-bottom: var(--gap-sm);
        }

        /*> ._content {
          display: block;
        }

        &:last-child {
          margin-bottom: 0;
        }*/
      }

      &[sd-layout="table"] {
        display: table-row;
        vertical-align: top;

        > label {
          display: table-cell;
          vertical-align: middle;
          padding: var(--gap-sm) var(--gap-default) calc(var(--gap-sm) * 2) 0;
          text-align: right;
        }

        > ._content {
          display: table-cell;
          vertical-align: middle;
          padding-bottom: var(--gap-sm);
        }

        &:last-child {
          > label {
            padding-bottom: var(--gap-sm);
          }

          > ._content {
            padding-bottom: 0;
          }
        }
      }

      &[sd-layout="inline"] {
        //display: inline-block;
        //vertical-align: top;
        //margin: var(--gap-xs) var(--gap-default) var(--gap-xs) 0;
        display: flex;
        flex-wrap: nowrap;
        align-items: center;

        > label {
          display: block;
          white-space: nowrap;
          padding-left: var(--gap-sm);
          padding-right: var(--gap-sm);
        }

        /*> ._content {
          display: inline-block;
          vertical-align: middle;
        }

        &:last-child {
          margin-right: 0;
        }*/
      }

      &[sd-layout="none"] {
        display: contents;
      }

      &[sd-label-align="left"] {
        > label {
          text-align: left;
        }
      }

      &[sd-label-align="right"] {
        > label {
          text-align: right;
        }
      }

      &[sd-label-align="center"] {
        > label {
          text-align: center;
        }
      }
    }
  `]
})
export class SdFormItemControl {
  @Input()
  @SdInputValidate(String)
  public label?: string;

  @ContentChild("label", { static: true })
  public labelTemplateRef?: TemplateRef<{ label?: string }>;

  @HostBinding("attr.sd-label-align")
  public get labelAlign(): "left" | "right" | "center" | undefined {
    return this._parentFormControl.labelAlign;
  }

  @HostBinding("attr.sd-layout")
  public get layout(): "cascade" | "inline" | "table" | "none" | undefined {
    return this._parentFormControl.layout;
  }

  public get labelWidth(): string | undefined {
    return this.layout === "table" ? this._parentFormControl.labelWidth : undefined;
  }

  public constructor(@Inject(forwardRef(() => SdFormControl))
                     private readonly _parentFormControl: SdFormControl) {
  }
}
