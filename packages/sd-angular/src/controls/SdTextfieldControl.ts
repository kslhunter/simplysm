import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from "@angular/core";
import {SdSizeString, SdThemeString} from "../commons/types";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-textfield",
  template: `
    <sd-dock-container>
      <sd-pane>
        <input [type]="type === 'number' ? 'text' : type"
               [required]="required"
               [disabled]="disabled"
               [attr.step]="step"
               [attr.min]="min"
               [attr.placeholder]="placeholder"
               [value]="displayText"
               (input)="onInputInput($event)"
               (focus)="onInputFocus($event)"
               (blur)="onInputBlur($event)"/>
        <div></div>
      </sd-pane>
      <sd-dock position="right">
        <ng-content></ng-content>
      </sd-dock>
    </sd-dock-container>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdTextfieldControl}]
})
export class SdTextfieldControl extends SdComponentBase implements OnChanges {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["text", "password", "number", "date", "month", "year"].includes(value),
    notnull: true
  })
  public type: "text" | "password" | "number" | "date" | "month" | "year" = "text";

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(Number)
  public step?: number;

  @Input()
  @SdTypeValidate(Number)
  public min?: number;

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  public value?: any;

  @Input()
  @SdTypeValidate("SdSizeString")
  @HostBinding("attr.sd-size")
  public size?: SdSizeString;

  @Input()
  @SdTypeValidate("SdThemeString")
  @HostBinding("attr.sd-theme")
  public theme?: SdThemeString;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  public displayText = "";

  public focused = false;

  public ngOnChanges(changes: SimpleChanges): void {
    if (Object.keys(changes).some(key => ["value", "type"].includes(key))) {
      this.reloadDisplayText();
    }
  }

  public onInputFocus(event: Event): void {
    this.focused = true;
  }

  public onInputBlur(event: Event): void {
    this.focused = false;
    this.reloadDisplayText();
  }

  public onInputInput(event: Event): void {
    const targetEl = event.target as HTMLInputElement;
    const value = targetEl.value;
    if (this.type === "number") {
      const num = Number(value.replace(",", ""));
      this.value = Number.isNaN(num) ? 0 : num;
    }
    else {
      this.value = value;
    }

    this.valueChange.emit(this.value);
  }

  public reloadDisplayText(): void {
    if (this.value != undefined && this.type === "number" && !this.focused) {
      this.displayText = this.value.toLocaleString();
      return;
    }
    else {
      this.displayText = this.value || "";
    }
  }
}
