import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Injector,
  Input
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [type]="type" [disabled]="disabled">
      <ng-content></ng-content>
    </button>
    <div class="_invalid-indicator"></div>`
})
export class SdButtonControl extends SdControlBase implements AfterContentChecked {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
    :host {
      display: block;
      position: relative;

      & > button {
        display: block;
        width: 100%;
        font-size: ${vars.fontSize.default};
        font-family: ${vars.fontFamily};
        line-height: ${vars.lineHeight};
        color: ${vars.textColor.default};
        padding: ${vars.gap.small} ${vars.gap.default};

        border: 1px solid ${vars.transColor.default};
        user-select: none;

        background: white;
        cursor: pointer;
        transition: .1s linear;
        color: ${vars.textColor.default};

        &:hover {
          background: ${vars.transColor.dark};
        }

        &:active {
          transition: none;
          background: ${vars.transColor.darker};
        }

        &:disabled {
          background: transparent;
          cursor: default;
          color: ${vars.textColor.default};
        }

        &:focus {
          outline-color: transparent;
          border: 1px solid ${vars.themeColor.primary.darkest} !important;
        }
      }` +

      Object.keys(vars.themeColor).map(key => `
            &[sd-theme=${key}] > button {
              background: ${vars.themeColor[key].default};
              border-color: ${vars.themeColor[key].default};
              color: ${vars.textReverseColor.default};

              &:hover {
                background: ${vars.themeColor[key].dark};
                border-color: ${vars.themeColor[key].dark};
              }

              &:active {
                background: ${vars.themeColor[key].dark};
              }

              &:disabled {
                background: ${vars.themeColor.grey.default};
                border-color: ${vars.themeColor.grey.default};
                cursor: default;
              }
            }`).join("\n")
      + `
      &[sd-size=sm] > button {
        padding: ${vars.gap.smaller} ${vars.gap.small};
      }

      &[sd-size=lg] > button {
        padding: ${vars.gap.default} ${vars.gap.large};
      }

      &[sd-inline=true] {
        display: inline-block;

        > button {
          width: auto;
        }
      }

      &[sd-invalid=true] > ._invalid-indicator {
        display: block;
        position: absolute;
        top: 2px;
        left: 2px;
        border-radius: 100%;
        width: 4px;
        height: 4px;
        background: ${vars.themeColor.danger.default};
      }

      &[sd-inset=true] {
        > button {
          border: none !important;
        }
      }
    }`;
  }

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["primary", "info", "success", "warning", "danger"].includes(value)
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["sm", "lg"].includes(value)
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["button", "submit"].includes(value),
    notnull: true
  })
  public type: "button" | "submit" = "button";

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @HostBinding("attr.sd-invalid")
  public isInvalid = false;

  public constructor(injector: Injector,
                     private readonly _elRef: ElementRef<HTMLElement>) {
    super(injector);
  }

  public ngAfterContentChecked(): void {
    this.isInvalid = false;

    if (this.required) {
      if (!(this._elRef.nativeElement.findAll("> button")[0] as HTMLElement).innerText.trim()) {
        this.isInvalid = true;
      }
    }
  }
}