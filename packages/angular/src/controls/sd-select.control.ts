import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {JsonConvert} from "@simplism/core";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select [value]="valueJson"
            [required]="required"
            (change)="onSelectChange($event)">
      <ng-content></ng-content>
    </select>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;

      > select {
        @include form-control-base();

        background: trans-color(default);
        border-color: trans-color(default);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;

        &:focus {
          outline-color: theme-color(primary, default);
        }

        &:disabled {
          background: black;
          color: text-color(light);
        }

        /deep/ > option {
          background: theme-color(bluegrey, darkest);
        }
      }
    }
  `]
})
export class SdSelectControl {
  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  public get valueJson(): string {
    return JsonConvert.stringify(this.value);
  }

  public onSelectChange(event: Event): void {
    this.value = JsonConvert.parse((event.target as HTMLInputElement).value);
    this.valueChange.emit(this.value);
  }
}