import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from "@angular/core";
import { SdInputValidate } from "../commons/SdInputValidate";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="onSubmit($event)">
      <ng-content></ng-content>
    </form>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
      &[sd-layout="table"] > form {
        display: table;
        width: 100%;
      }
    }
  `]
})
export class SdFormControl {
  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: ["cascade", "inline", "table"]
  })
  @HostBinding("attr.sd-layout")
  public layout: "cascade" | "inline" | "table" = "cascade";

  @Input("label.width")
  @SdInputValidate(String)
  public labelWidth?: string;

  @Output()
  public readonly submit = new EventEmitter<void>();

  public onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit.emit();
  }
}