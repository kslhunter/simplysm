import {ChangeDetectionStrategy, Component, HostBinding, Injector, Input} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdLabelControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: inline-block;
        background: ${vars.themeColor.grey.darkest};
        color: ${vars.textReverseColor.default};
        padding: 0 ${vars.gap.xs};
        border-radius: 2px;
        text-indent: 0;` +

      Object.keys(vars.themeColor).map(key => `
        &[sd-theme='${key}'] {
          background:${vars.themeColor[key].default};
        }`
      ).join("\n") + `

        &[sd-clickable=true] {
          cursor: pointer;

          &:hover {
            background: ${vars.themeColor.grey.dark};` +

      Object.keys(vars.themeColor).map(key => `
            &[sd-theme='${key}'] {
              background:${vars.themeColor[key].dark};
            }`
      ).join("\n") + `
            
          }
        }
      }`;
  }

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"].includes(value)
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => /^#[0-9a-fA-F]*$/.test(value)
  })
  @HostBinding("style.background")
  public color?: string;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-clickable")
  public clickable?: boolean;

  public constructor(injector: Injector) {
    super(injector);
  }
}