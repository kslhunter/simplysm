import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {JsonConvert} from "@simplism/sd-core";
import {SdSizeString, SdThemeString} from "../commons/types";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-select",
  template: `
    <select [value]="valueJson"
            [disabled]="disabled"
            [required]="required"
            (change)="onValueChange($event)">
      <ng-content></ng-content>
    </select>
    <div></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdSelectControl}]
})
export class SdSelectControl extends SdComponentBase {
  @Input()
  public value?: any;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate("SdThemeString")
  @HostBinding("attr.sd-theme")
  public theme?: SdThemeString;

  @Input()
  @SdTypeValidate("SdSizeString")
  @HostBinding("attr.sd-size")
  public size?: SdSizeString;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  public get valueJson(): string {
    return JsonConvert.stringify(this.value);
  }

  public onValueChange(value: string | undefined | null): void {
    this.value = JsonConvert.parse(value || undefined);
    this.valueChange.emit(this.value);
  }
}

@Component({
  selector: "option", // tslint:disable-line:component-selector
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: OptionControl}]
})
export class OptionControl extends SdComponentBase {
  @Input()
  public value?: any;

  @HostBinding("attr.value")
  public get valueJson(): string {
    return JsonConvert.stringify(this.value);
  }
}