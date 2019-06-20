import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {IconName} from "@fortawesome/fontawesome-svg-core";
// import {sdIconNames} from "../commons/icons";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label tabindex="0" (keydown)="onKeydown($event)">
      <input [checked]="value" (change)="onValueChange($event)" type="checkbox" hidden [disabled]="disabled">
      <div class="_indicator_rect"></div>
      <sd-icon class="_indicator" [icon]="icon" [fw]="true" *ngIf="!radio"></sd-icon>
      <div class="_indicator" *ngIf="radio">
        <div></div>
      </div>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </label>`
})
export class SdCheckboxControl {
  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-checked")
  public value = false;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-radio")
  public radio?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    notnull: true/*,
    includes: sdIconNames*/
  })
  public icon: IconName = "check";

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.value = el.checked;
    this.valueChange.emit(this.value);
  }

  public onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (event.key === " ") {
      this.value = !this.value;
      this.valueChange.emit(this.value);
    }
  }
}
