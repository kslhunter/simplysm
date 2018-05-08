import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-modal",
  template: `
    <div></div>
    <div tabindex="0">
      <div>
        <h4>{{ title }}</h4>
        <a (click)="onCloseButtonClick()" *ngIf="!hideCloseButton">
          <sd-icon [icon]="'times'" [fixedWidth]="true"></sd-icon>
        </a>
      </div>
      <div>
        <ng-content></ng-content>
      </div>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdModalControl}]
})
export class SdModalControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({type: String, notnull: true})
  public title = "창";

  @Input()
  @SdTypeValidate(Boolean)
  public hideCloseButton?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("ngIf")
  public open?: boolean;

  @Output()
  public readonly openChange = new EventEmitter<boolean>();

  public onCloseButtonClick(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }
}