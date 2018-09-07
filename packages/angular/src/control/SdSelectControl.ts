import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {JsonConvert} from "@simplism/core";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select [value]="valueJson"
            [required]="required"
            (change)="onSelectChange($event)"
            [disabled]="disabled">
      <ng-content></ng-content>
    </select>
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      color: text-color(default);
      position: relative;

      > select {
        @include form-control-base();
        color: inherit;

        padding: gap(sm) - 3 gap(default) gap(sm) gap(default) - 4;
        background: white;
        border-color: trans-color(default);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;

        &:focus {
          outline-color: theme-color(primary, default);
        }

        &:disabled {
          -webkit-appearance: none;
          background: $bg-color;
          color: text-color(light);
          padding: gap(sm) gap(default);
          pointer-events: none;
        }

        /deep/ > option {
          color: text-color(default);
          /*background: theme-color(bluegrey, darkest);*/
        }
      }

      > ._invalid-indicator {
        display: none;
      }
      
      &[sd-invalid=true] > ._invalid-indicator {
        display: block;
        position: absolute;
        top: 2px;
        left: 2px;
        border-radius: 100%;
        width: 4px;
        height: 4px;
        background: get($theme-color, danger, default);
      }
    }
  `]
})
export class SdSelectControl {
  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @HostBinding("attr.sd-invalid")
  public get isInvalid(): boolean {
    return !!this.required && this.value == undefined;
  }

  public get valueJson(): string | undefined {
    return JsonConvert.stringify(this.value) || "null";
  }

  public onSelectChange(event: Event): void {
    this.value = JsonConvert.parse((event.target as HTMLInputElement).value) == undefined ? undefined
      : JsonConvert.parse((event.target as HTMLInputElement).value);
    this.valueChange.emit(this.value);
  }
}