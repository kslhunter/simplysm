import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTextfieldControl} from "./SdTextfieldControl";

@Component({
  selector: "sd-textarea",
  template: `
    <textarea [attr.placeholder]="placeholder"
              [attr.rows]="rows"
              [value]="value"
              [disabled]="disabled"
              (change)="onTeatareaChange($event)"></textarea>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdTextfieldControl}]
})
export class SdTextareaControl extends SdComponentBase {
  @Input()
  public value?: string;

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public rows = 3;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled = false;

  @Output()
  public readonly valueChange: EventEmitter<string> = new EventEmitter<string>();

  public onTeatareaChange(event: Event): void {
    const targetElem = event.target as HTMLInputElement;
    this.value = targetElem.value;
    this.valueChange.emit(this.value);
  }
}
