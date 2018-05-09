// tslint:disable:use-host-property-decorator

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
  ViewChild
} from "@angular/core";
import {Exception} from "../../../sd-core/src/exceptions/Exception";
import {Safe} from "../../../sd-core/src/utils/Safe";
import {SimgularHelpers} from "../helpers/SimgularHelpers";

@Component({
  selector: "sd-text-field",
  template: `
    <input [placeholder]="placeholder"
           [value]="displayValue === undefined ? null : displayValue"
           (input)="onInput($event)"
           [type]="type === 'number' ? 'text' : type"
           [ngClass]="styleClass"
           [disabled]="disabled"
           [maxLength]="maxLength || 524288"
           [ngStyle]="getStyle()"
           [required]="required"
           (touchend)="onTouchend()"
           (blur)="onBlur()"
           [name]="autoComplete"
           [autocomplete]="autoComplete ? 'on' : 'off'"
           #input/>
    <div class="_sd-text-field-button-group">
      <ng-content></ng-content>
    </div>`,
  host: {
    "[class._inline]": "inline"
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTextFieldControl implements AfterViewInit {
  public displayValue: any;

  @Input() public validator?: (value: any | undefined) => boolean;
  @Input() public autoComplete?: string;
  @Output() public readonly valueChange = new EventEmitter<any>();
  @Input() public placeholder = "";
  @Input() public inline = false;
  @Input() public disabled = false;
  @Input() public required = false;
  @Input() public maxLength: number | undefined = undefined;
  @Input() public min: number | undefined = undefined;
  @Input() public max: number | undefined = undefined;
  @ViewChild("input") public inputElementRef?: ElementRef;
  private _inputTimeout?: number;
  private readonly _style: { [key: string]: any } = {};

  @Input()
  public set style(value: string) {
    const styles = value.split(";");
    for (const style of styles) {
      if (style.includes(":")) {
        const name = style.split(":")[0];
        this._style[name] = style.split(":")[1];
      }
    }
  }

  private _value: any;

  @Input()
  public set value(value: any) {
    this._value = value;
    this.reloadDisplayValue();
  }

  private _step = 1;

  @Input()
  public set step(value: number | undefined) {
    const currValue = value === null || value === undefined
      ? 1 : value;

    if (typeof currValue !== "number") {
      throw new Exception(`'sd-text-field.step'에 잘못된값 '${JSON.stringify(currValue)}'가 입력되었습니다.`);
    }
    this._step = currValue;
  }

  private _type = "text";

  public get type(): string {
    return this._type;
  }

  @Input()
  public set type(value: string) {
    if (!["text", "password", "number", "date", "month", "year"].includes(value)) {
      throw new Exception(`'sd-text-field.type'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
    }
    this._type = value;
    this.reloadDisplayValue();
  }

  public get styleClass(): string[] {
    let hasError = false;
    if (this.type === "number") {
      if (this._value === undefined && !this.required) {
        hasError = hasError || false;
      }
      else {
        const stepLeft = (this._step.toString().split(".")[0] || "0");
        const stepRight = (this._step.toString().split(".")[1] || "");
        const stepLeftLength = stepLeft.includes("1") ? stepLeft.length : 0;
        const stepRightLength = stepRight.includes("1") ? stepRight.length : 0;
        const valueLeftLength = this._value !== undefined ? Safe.obj(this._value.toString().split(".")[0]).length : 0;
        const valueRightLength = this._value !== undefined ? Safe.obj(this._value.toString().split(".")[1]).length : 0;

        if (valueLeftLength < stepLeftLength) {
          hasError = hasError || true;
        }
        if (valueRightLength > stepRightLength) {
          hasError = hasError || true;
        }
      }
    }

    if (this.min !== undefined && this._value < this.min) {
      hasError = hasError || true;
    }
    if (this.max !== undefined && this._value > this.max) {
      hasError = hasError || true;
    }

    if (this.validator) {
      hasError = hasError || !this.validator(this._value);
    }

    return [
      this.inline ? "_inline" : "",
      this._size ? `_size-${this._size}` : "",
      this.disabled ? "_disabled" : "",
      `_type-${this.type}`,
      hasError ? "_error" : ""
    ].filter(item => item);
  }

  private _size = "default";

  @Input()
  public set size(value: string) {
    if (!["default", "sm"].includes(value)) {
      throw new Exception(`'sd-text-field.size'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
    }
    this._size = value;
  }

  public constructor(private readonly _elementRef: ElementRef,
                     private readonly _zone: NgZone) {
  }

  public getStyle(): { [key: string]: any } {
    return this._style;
  }

  public ngAfterViewInit(): void {
    this._zone.runOutsideAngular(() => {
      const $this = $(this._elementRef.nativeElement);
      SimgularHelpers.detectElementChange($this.children("._sd-text-field-button-group").get(0), () => {
        if (
          $this
            .children("._sd-text-field-button-group")
            .children()
            .toArray()
            .some(item => !["sd-button"].includes(item.tagName.toLowerCase()))
        ) {
          throw new Error('"sd-text-field"안에는, "sd-button"외의 엘리먼트를 사용할 수 없습니다.');
        }
        this._resizingButtonGroup();
      }, {resize: false});
    });
  }

  public onInput(e: Event): void {
    window.clearTimeout(this._inputTimeout!);

    this.displayValue = $(e.target!).val();

    this._inputTimeout = setTimeout(() => {
      const prevValue = this._value;
      this.reloadValue();
      const newValue = this._value;
      if (prevValue !== newValue) {
        this.valueChange.emit(this._value);
      }
    });
  }

  public onTouchend(): void {
    const $input = $(this._elementRef.nativeElement).children("input");
    $input.trigger("select");
  }

  public onBlur(): void {
    this.reloadDisplayValue();
  }

  public reloadDisplayValue(): void {
    if (this._value === undefined) {
      this.displayValue = "";
    }
    else if (this.type === "number") {
      this.displayValue = this._value.toLocaleString();
    }
    else {
      this.displayValue = this._value;
    }
  }

  public reloadValue(): void {
    if (this.type === "number") {
      if (this.displayValue === undefined || this.displayValue === null) {
        this._value = undefined;
      }
      else {
        const value = Number(this.displayValue.toString().replace(/[^0-9.]/g, ""));
        this._value = Number.isNaN(value) ? undefined : value;
      }
    }
    else {
      this._value = this.displayValue;
    }
  }

  private _resizingButtonGroup(): void {
    const $input = $(this._elementRef.nativeElement).children("input");
    const $buttonGroup = $(this._elementRef.nativeElement).children("._sd-text-field-button-group");

    $input.css("padding-right", $buttonGroup.outerWidth() || "");
    $buttonGroup.css({
      top: `${getComputedStyle($input.get(0)).borderTopWidth}px`,
      right: `${getComputedStyle($input.get(0)).borderRightWidth}px`
    });
  }
}
