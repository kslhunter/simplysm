import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label tabindex="0">
      <input [checked]="value" (change)="onValueChange($event)" type="checkbox" hidden [disabled]="disabled">
      <div class="_indicator_rect"></div>
      <sd-icon class="_indicator" [icon]="'check'" [fixedWidth]="true" *ngIf="!radio"></sd-icon>
      <div class="_indicator" *ngIf="radio">
        <div></div>
      </div>
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
          vertical-align: top;
        }

        > ._indicator {
          display: inline-block;
          position: relative;
          opacity: 0;
          transition: opacity .1s linear;
          color: text-color(default);
          width: $line-height;
          height: $line-height;
          vertical-align: top;
        }

        > ._content {
          display: inline-block;
          vertical-align: top;
          text-indent: gap(xs);

          > /deep/ * {
            text-indent: 0;
          }
        }

        > input:disabled + ._indicator_rect {
          background: $bg-color;
        }

        &:focus {
          outline: none;
          > ._indicator_rect {
            border-color: theme-color(primary, default);
          }
        }
      }

      &[sd-checked=true] {
        > label {
          > ._indicator {
            opacity: 1;
          }
        }
      }

      &[sd-inline=true] {
        display: inline-block;
        > label {
          padding-left: 0;
        }
      }

      &[sd-radio=true] {
        > label {
          > ._indicator_rect {
            border-radius: 100%;
          }
          > ._indicator {
            padding: 3px;
          }
          > ._indicator > div {
            border-radius: 100%;
            background: text-color(default);
            width: 100%;
            height: 100%;
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

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-radio")
  public radio?: boolean;

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.value = el.checked;
    this.valueChange.emit(this.value);
  }
}