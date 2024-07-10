import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  forwardRef,
  inject,
  Input,
  TemplateRef,
  ViewEncapsulation
} from "@angular/core";
import {SdFormBoxControl} from "./SdFormBoxControl";
import {NgTemplateOutlet} from "@angular/common";

@Component({
  selector: "sd-form-box-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
  ],
  template: `
    <label [style.width]="labelWidth"
           [hidden]="layout === 'none'"
           [attr.title]="labelTooltip"
           [class.help]="labelTooltip">
      @if (!labelTemplateRef) {
        <ng-container>{{ label }}</ng-container>
      } @else {
        <ng-template [ngTemplateOutlet]="labelTemplateRef"/>
      }
    </label>
    <div class="_content">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    sd-form-box-item {
      > label {
        white-space: nowrap;
        font-weight: bold;
        border: 1px solid transparent;
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
          vertical-align: top;
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
  `],
  host: {
    "[attr.sd-label-align]": "labelAlign",
    "[attr.sd-layout]": "layout",
    "[attr.sd-no-label]": "label == null && !labelTemplateRef"
  }
})
export class SdFormBoxItemControl {
  @Input() label?: string;
  @Input() labelTooltip?: string;

  @ContentChild("label", {static: true}) labelTemplateRef?: TemplateRef<void>;

  #parentControl = inject<SdFormBoxControl>(forwardRef(() => SdFormBoxControl));

  get labelAlign(): "left" | "right" | "center" | undefined {
    return this.#parentControl.labelAlign;
  }

  get layout(): "cascade" | "inline" | "table" | "none" | undefined {
    return this.#parentControl.layout;
  }

  get labelWidth(): string | undefined {
    return this.#parentControl.layout === "table" ? this.#parentControl.labelWidth : undefined;
  }
}