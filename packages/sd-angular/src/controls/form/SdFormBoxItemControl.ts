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
import {SdFormBoxControl} from "./SdFormBoxControl";
import {SdInputValidate} from "../../utils/SdInputValidate";

@Component({
  selector: "sd-form-box-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.unvisible]="!label && !labelTemplateRef"
           [style.width]="labelWidth"
           [hidden]="layout === 'none'"
           [style.text-align]="labelAlign"
           [title]="labelTooltip"
           [class.sd-help]="labelTooltip">
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
        white-space: nowrap;
      }

      &[sd-layout="cascade"] {
        display: block;

        > label {
          display: block;
          margin-bottom: var(--gap-xs);
        }
      }

      &[sd-layout="table"] {
        display: table-row;
        vertical-align: top;

        > label {
          display: table-cell;
          vertical-align: top;
          padding: var(--gap-sm) var(--gap-default) calc(var(--gap-sm) * 2) 0;
          text-align: right;
          width: 0;
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
        display: flex;
        flex-wrap: nowrap;
        align-items: center;

        > label {
          display: block;
          white-space: nowrap;
          padding-left: var(--gap-sm);
          padding-right: var(--gap-sm);
        }
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
export class SdFormBoxItemControl {
  @Input()
  @SdInputValidate(String)
  public label?: string;

  @Input()
  @SdInputValidate(String)
  public labelTooltip?: string;

  @ContentChild("label", {static: true})
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

  public constructor(@Inject(forwardRef(() => SdFormBoxControl))
                     private readonly _parentFormControl: SdFormBoxControl) {
  }
}
