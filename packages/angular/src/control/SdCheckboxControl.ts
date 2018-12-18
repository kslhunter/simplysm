import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Injector, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

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
    </label>`
})
export class SdCheckboxControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
:host {
  color: text-color(default);

  > label {
    ${vars.formControlBase};
    user-select: none;
  
    color: inherit;
    cursor: pointer;
    position: relative;

    > ._indicator_rect {
      position: absolute;
      display: block;
      width: ${vars.lineHeight};
      height: ${vars.lineHeight};
      border: 1px solid ${vars.transColor.default};
      background: white;
      vertical-align: top;
      transition: border-color .1s linear;
    }

    > ._indicator {
      display: inline-block;
      position: relative;
      opacity: 0;
      transition: opacity .1s linear;
      color:  ${vars.textColor.default};
      width: ${vars.lineHeight};
      height: ${vars.lineHeight};
      vertical-align: top;
    }

    > ._content {
      display: inline-block;
      vertical-align: top;
      text-indent: ${vars.gap.xs};

      > * {
        text-indent: 0;
      }
    }

    > input:disabled + ._indicator_rect {
      background: ${vars.bgColor};
    }

    &:focus {
      outline-color: transparent;

      > ._indicator_rect {
        border-color: ${vars.themeColor.primary.default};
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
        padding: 4px;
      }

      > ._indicator > div {
        border-radius: 100%;
        background: ${vars.textColor.default};
        width: 100%;
        height: 100%;
      }
    }
  }
}`;
  }

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

  public constructor(injector: Injector) {
    super(injector);
  }

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.value = el.checked;
    this.valueChange.emit(this.value);
  }
}