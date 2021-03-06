import {ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-form-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <label [style.display]="label || labelTemplateRef ? 'display' : 'none'">
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
export class SdFormItemControl {
  @Input()
  @SdTypeValidate(String)
  public label?: string;

  @ContentChild("label", {static: true})
  public labelTemplateRef?: TemplateRef<any>;
}
