import {ChangeDetectionStrategy, Component, ContentChild, Injector, Input, TemplateRef} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-form-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [style.display]="label ? 'display' : 'none'">
      <ng-container *ngIf="!labelTemplateRef">{{ label }}</ng-container>
      <ng-container *ngIf="labelTemplateRef">
        <ng-template [ngTemplateOutlet]="labelTemplateRef"
                     [ngTemplateOutletContext]="{label: label}"></ng-template>
      </ng-container>
    </label>
    <div>
      <ng-content></ng-content>
    </div>`
})
export class SdFormItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
:host {
  display: block;
  margin-bottom: ${vars.gap.default};

  &:last-child {
    margin-bottom: 0;
  }

  & > label {
    display: block;
    font-weight: bold;
    margin-bottom: ${vars.gap.xs};
  }

  /*@media ${vars.media.mobile} {
    width: 100%;
    margin: 0;
    overflow-x: hidden;

    > label {
      padding: ${vars.gap.xs} ${vars.gap.sm};
      font-size: ${vars.fontSize.sm};
      background: rgba(0, 0, 0, .1);
      margin: 0;
    }

    > div {
      > sd-textfield > input {
        border: none;
      }

      > sd-markdown-editor {
        border: none;
      }

      > sd-select > select {
        border: none;
      }

      > sd-multi-select > sd-dropdown > div {
        border: none;
      }
    }
  }*/
}`;
  }

  @Input()
  @SdTypeValidate(String)
  public label?: string;

  @ContentChild("label")
  public labelTemplateRef?: TemplateRef<any>;

  public constructor(injector: Injector) {
    super(injector);
  }
}