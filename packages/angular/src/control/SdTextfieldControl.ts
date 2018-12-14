import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";
import {DateOnly, DateTime} from "@simplism/core";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input #input
           [type]="type === 'number' ? 'text' : type === 'datetime' ? 'datetime-local' : type"
           [required]="required"
           [value]="controlValue"
           [placeholder]="placeholder || ''"
           [attr.pattern]="pattern"
           [attr.sd-invalid]="getIsInvalid()"
           (input)="onInputInput($event)"
           (focus)="onFocus($event)"
           (blur)="onBlur($event)"
           [disabled]="disabled"
           [style.text-align]="type === 'number' ? 'right' : undefined"/>
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;

      & > input {
        @include form-control-base();

        background: white;
        border-color: trans-color(default);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;

        &::-webkit-input-placeholder {
          color: text-color(lighter);
        }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        &::-webkit-calendar-picker-indicator {
          background: white;
          color: text-color(default);
          cursor: pointer;
        }

        &:focus {
          outline-color: theme-color(primary, default);
        }

        &:disabled {
          background: $bg-color;
          color: text-color(light);
        }

        &[type='color'] {
          padding: 0 gap(xs) !important;
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      > input[sd-invalid=true] + ._invalid-indicator,
      > input:invalid + ._invalid-indicator {
        display: block;
        position: absolute;
        top: 2px;
        left: 2px;
        border-radius: 100%;
        width: 4px;
        height: 4px;
        background: get($theme-color, danger, default);
      }

      &[sd-inset=true] {
        > input {
          border: none;
          background: theme-color(info, lightest);
        }
      }
    }
  `]
})
export class SdTextfieldControl implements ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["number", "text", "password", "date", "datetime", "month", "color", "email"].includes(value),
    notnull: true
  })
  public type: "number" | "text" | "password" | "date" | "datetime" | "month" | "color" | "email" = "text";

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate([Number, String, DateOnly, DateTime])
  public value?: number | string | DateOnly | DateTime;

  @Output()
  public readonly valueChange = new EventEmitter<string | number | DateOnly | DateTime | undefined>();

  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @SdNotifyPropertyChange()
  public focused = false;

  @Output()
  public readonly focusedChange = new EventEmitter<boolean>();

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(Number)
  public min?: number;

  @Input()
  @SdTypeValidate(Number)
  public step?: number;

  @Input()
  @SdTypeValidate(String)
  public pattern?: string;

  @ViewChild("input")
  public inputElRef?: ElementRef<HTMLInputElement>;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  public getIsInvalid(): boolean {
    const hasMinError = this.min !== undefined && this.value !== undefined && this.type === "number" && this.value < this.min;
    const hasStepError = this.step !== undefined && this.value !== undefined && this.type === "number" && Math.abs(Number(this.value) % this.step) >= 1;
    return hasMinError || hasStepError;
  }

  public get controlValue(): number | string {
    return this.value === undefined ? ""
      : this.value instanceof DateTime ? this.value.toFormatString("yyyy-MM-ddTHH:mm")
        : this.value instanceof DateOnly ? (this.type === "month" ? this.value.toFormatString("yyyy-MM") : this.value.toString())
          : this.type === "number" && typeof this.value === "number" ? this.value.toLocaleString()
            : this.value;
  }

  public onInputInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    let value;
    if (this.type === "number") {
      value = !inputEl.value ? undefined : Number(inputEl.value.replace(/,/g, ""));
    }
    else if (this.type === "date" || this.type === "month") {
      value = !inputEl.value ? undefined : DateOnly.parse(inputEl.value);
    }
    else if (this.type === "datetime") {
      value = !inputEl.value ? undefined : DateTime.parse(inputEl.value);
    }
    else {
      value = inputEl.value;
    }

    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(this.value);
    }
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
        if (document.activeElement !== this.inputElRef.nativeElement) {
          this.inputElRef.nativeElement.focus();
        }
      }
      else {
        if (document.activeElement === this.inputElRef.nativeElement) {
          this.inputElRef.nativeElement.blur();
        }
      }
    }
  }
}