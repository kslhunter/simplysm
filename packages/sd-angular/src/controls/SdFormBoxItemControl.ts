import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  forwardRef,
  HostBinding,
  inject,
  Input,
  TemplateRef
} from "@angular/core";
import {SdFormBoxControl} from "./SdFormBoxControl";
import {NgIf, NgTemplateOutlet} from "@angular/common";

@Component({
  selector: "sd-form-box-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf,
    NgTemplateOutlet,
  ],
  template: `
    <label [style.width]="labelWidth"
           [hidden]="layout === 'none'"
           [style.text-align]="labelAlign"
           [title]="labelTooltip"
           [class.help]="labelTooltip">
      <ng-container *ngIf="!labelTemplateRef">{{ label }}</ng-container>
      <ng-container *ngIf="labelTemplateRef">
        <ng-template [ngTemplateOutlet]="labelTemplateRef"/>
      </ng-container>
    </label>
    <div class="_content">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    :host {
      > label {
        white-space: nowrap;
        font-weight: bold;

        /*body.sd-theme-compact & {
          font-weight: bold;          
        }*/
      }

      &[sd-layout="cascade"] {
        display: block;

        > label {
          display: block;
          margin-bottom: var(--gap-xs);
        }

        @media all and (pointer: coarse) {
          margin-bottom: var(--gap-default);
          
          > label {
            margin-bottom: var(gap-xxs);
          }
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

      &[sd-no-label=true] {
        > label {
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      }
    }
  `]
})
export class SdFormBoxItemControl {
  @Input()
  label?: string;

  @Input()
  labelTooltip?: string;

  @ContentChild("label", {static: true})
  labelTemplateRef?: TemplateRef<void>;

  #parentFormControl: SdFormBoxControl = inject(forwardRef(() => SdFormBoxControl));

  @HostBinding("attr.sd-label-align")
  get labelAlign(): "left" | "right" | "center" | undefined {
    return this.#parentFormControl.labelAlign;
  }

  @HostBinding("attr.sd-layout")
  get layout(): "cascade" | "inline" | "table" | "none" | undefined {
    return this.#parentFormControl.layout;
  }

  @HostBinding("attr.sd-no-label")
  get noLabel(): boolean {
    return this.label == null && !this.labelTemplateRef;
  }

  get labelWidth(): string | undefined {
    return this.layout === "table" ? this.#parentFormControl.labelWidth : undefined;
  }
}