import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorators/SdNotifyPropertyChange";
import {DateOnly} from "@simplism/core";

@Component({
  selector: "sd-textfield",
  template: `
    <input #input
           [type]="type"
           [required]="required"
           [value]="value == undefined ? '' : value"
           [placeholder]="placeholder || ''"
           (input)="onInputInput($event)"
           (focus)="onFocus($event)"
           (blur)="onBlur($event)"
           [disabled]="disabled"/>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      & > input {
        @include form-control-base();

        background: trans-color(default);
        border-color: trans-color(default);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;

        &::-webkit-input-placeholder {
          color: text-color(darker);
        }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        &::-webkit-calendar-picker-indicator {
          background: transparent;
          color: text-color(default);
          cursor: pointer;
        }

        &:focus {
          outline-color: theme-color(primary, default);
        }

        &:disabled {
          background: black;
          color: text-color(light);
        }

      }
    }
  `]
})
export class SdTextfieldControl implements ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["number", "text", "password", "date"].includes(value),
    notnull: true
  })
  public type: "number" | "text" | "password" | "date" = "text";

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate([Number, String, DateOnly])
  public value?: number | string | DateOnly;

  @Output()
  public readonly valueChange = new EventEmitter<string | number | DateOnly | undefined>();

  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @SdNotifyPropertyChange()
  public focused = false;

  @Output()
  public readonly focusedChange = new EventEmitter<boolean>();

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @ViewChild("input")
  public inputElRef?: ElementRef<HTMLInputElement>;

  public onInputInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (this.type === "number") {
      this.value = Number(inputEl.value);
    }
    else if (this.type === "date") {
      this.value = DateOnly.parse(inputEl.value);
    }
    else {
      this.value = inputEl.value;
    }

    this.valueChange.emit(this.value);
  }

  public onFocus(event: Event): void {
    event.preventDefault();
    if (!this.focused) {
      this.focused = true;
      this.focusedChange.emit(this.focused);
    }
  }

  public onBlur(event: Event): void {
    event.preventDefault();
    if (this.focused) {
      this.focused = false;
      this.focusedChange.emit(false);
    }
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (propertyName === "focused" && this.inputElRef) {
      if (newValue) {
        this.inputElRef.nativeElement.focus();
      }
      else {
        this.inputElRef.nativeElement.blur();
      }
    }
  }
}