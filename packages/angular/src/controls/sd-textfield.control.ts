import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

@Component({
  selector: "sd-textfield",
  template: `
    <input #input
           [type]="type"
           [required]="required"
           [value]="value || ''"
           [placeholder]="placeholder || ''"
           (input)="onInputInput($event)"/>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host > input {
      @include form-control-base();

      background: trans-color(default);
      border-color: trans-color(default);
      transition: outline-color .1s linear;
      outline: 1px solid transparent;
      outline-offset: -1px;
      
      &::-webkit-input-placeholder {
        color: text-color(darker);
      }

      &:focus {
        outline-color: theme-color(primary, default);
      }
    }
  `]
})
export class SdTextfieldControl {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["text", "password"].includes(value),
    notnull: true
  })
  public type: "text" | "password" = "text";

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(String)
  public value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string>();

  @ViewChild("input")
  public inputElRef?: ElementRef<HTMLInputElement>;

  public onInputInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.value = inputEl.value;
    this.valueChange.emit(this.value);
  }

  public focus(): void {
    this.inputElRef!.nativeElement.focus();
  }
}