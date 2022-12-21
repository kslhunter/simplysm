import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from "@angular/core";
import { SdInputValidate } from "@simplysm/sd-angular";
import { StringUtil } from "@simplysm/sd-core-common";
import { faAngleDown } from "@fortawesome/pro-light-svg-icons/faAngleDown";

@Component({
  selector: "sdm-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select [value]="value"
            (change)="onChange($event)"
            [required]="required"
            [disabled]="disabled"
            [attr.class]="selectClass"
            [attr.style]="selectStyle"
            [attr.title]="title">
      <ng-content></ng-content>
    </select>
    <div class="_icon">
      <fa-icon [icon]="icons.falAngleDown" [fixedWidth]="true"></fa-icon>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      position: relative;
      display: block;

      @include mobile-active-effect(true);

      > select {
        display: block;
        width: 100%;
        padding: calc(var(--gap-sm) + 1px) 0 calc(var(--gap-sm) - 1px);
        border: none;
        border-bottom: 2px solid var(--border-color);
        background: transparent;

        font-size: var(--font-size-default);
        font-family: var(--font-family);
        line-height: var(--line-height);

        color: var(--text-brightness-default);

        transition: border-color 0.3s;

        appearance: none;
      }

      > ._icon {
        position: absolute;
        top: 0;
        right: 0;
        padding: calc(var(--gap-sm) + 1px) 0 calc(var(--gap-sm) - 1px);
        color: var(--text-brightness-lighter);
      }

      &[sd-invalid=true] {
        > select {
          border-bottom-color: var(--theme-color-danger-default);
        }
      }

      > select {
        &:focus {
          border-color: var(--theme-color-primary-default);
        }

        &:disabled {
          border-bottom-color: transparent;
          color: var(--text-brightness-light);
        }
      }

      &[sd-disabled=true] {
        @include mobile-active-effect(false);

        > ._icon {
          display: none;
        }
      }

      &[sd-size=sm] {
        > select {
          padding: calc(var(--gap-xs) + 1px) 0 calc(var(--gap-xs) - 1px);
        }
      }

      &[sd-size=lg] {
        > select {
          font-size: var(--font-size-lg);
          padding: calc(var(--gap-default) + 1px) 0 calc(var(--gap-default) - 1px);
        }
      }

      &[sd-inline=true] {
        display: inline-block;

        > select {
          display: inline-block;
          width: auto;
        }
      }

      &[sd-inset=true] {
        > select {
          border: none;

          &:focus {
            outline: 1px solid var(--theme-color-primary-default);
          }
        }
      }
    }
  `]
})
export class SdmSelectControl {
  public icons = {
    falAngleDown: faAngleDown
  };

  @Input()
  @SdInputValidate(String)
  public title?: string;

  @Input()
  @SdInputValidate(String)
  public value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input("select.style")
  @SdInputValidate(String)
  public selectStyle?: string;

  @Input("select.class")
  @SdInputValidate(String)
  public selectClass?: string;

  public onChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    if (this.valueChange.observed) {
      this.valueChange.emit(StringUtil.isNullOrEmpty(el.value) ? undefined : el.value);
    }
    else {
      this.value = StringUtil.isNullOrEmpty(el.value) ? undefined : el.value;
    }
  }
}
