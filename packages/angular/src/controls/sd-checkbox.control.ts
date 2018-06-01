import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label>
      <input [checked]="value" (change)="onValueChange($event)" type="checkbox" hidden>
      <div class="_indicator_rect"></div>
      <sd-icon class="_indicator" [icon]="'check'" [fixedWidth]="true"></sd-icon>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </label>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      > label {
        @include form-control-base();
        cursor: pointer;
        position: relative;

        > ._indicator_rect {
          position: absolute;
          display: block;
          width: $line-height;
          height: $line-height;
          border: 1px solid trans-color(default);
          background: trans-color(default);
        }

        > ._indicator {
          opacity: 0;
          transition: opacity .1s linear;
        }

        > ._content {
          display: inline-block;
          text-indent: gap(xs);
        }
      }

      &[sd-checked=true] {
        > label {
          > ._indicator {
            opacity: 1;
          }
        }
      }
    }
  `]
})
export class SdCheckboxControl {
  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-checked")
  public value = false;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.value = el.checked;
    this.valueChange.emit(this.value);
  }
}