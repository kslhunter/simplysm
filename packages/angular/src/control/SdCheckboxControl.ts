import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label tabindex="0">
      <input [checked]="value" (change)="onValueChange($event)" type="checkbox" hidden [disabled]="disabled">
      <div class="_indicator_rect"></div>
      <sd-icon class="_indicator" [icon]="'check'" [fixedWidth]="true"></sd-icon>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </label>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      color: text-color(default);

      > label {
        @include form-control-base();
        cursor: pointer;
        position: relative;
        color: inherit;

        > ._indicator_rect {
          position: absolute;
          display: block;
          width: $line-height;
          height: $line-height;
          border: 1px solid trans-color(default);
          background: white;
        }

        > ._indicator {
          position: relative;
          opacity: 0;
          transition: opacity .1s linear;
          color: text-color(default);
        }

        > ._content {
          display: inline-block;
          text-indent: gap(xs);

          > /deep/ * {
            text-indent: 0;
          }
        }

        > input:disabled + ._indicator_rect {
          background: $bg-color;
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

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.value = el.checked;
    this.valueChange.emit(this.value);
  }
}