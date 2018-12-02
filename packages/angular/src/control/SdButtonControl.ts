import {AfterContentChecked, ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [type]="type" [disabled]="disabled">
      <ng-content></ng-content>
    </button>
    <div class="_invalid-indicator"></div>`
})
export class SdButtonControl implements AfterContentChecked {
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

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
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