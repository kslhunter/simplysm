import { ChangeDetectionStrategy, Component, HostListener, input, output, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/tramsforms";
import { $model } from "../utils/$hooks";

@Component({
  selector: "sd-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";
      
      @use "../scss/variables";

      sd-switch {
        display: block;
        padding: var(--gap-sm) 0;
        border: 1px solid transparent;
        vertical-align: top;
        cursor: pointer;

        > div {
          height: var(--line-height);
          width: calc(var(--line-height) * 2 - var(--gap-xs));
          padding: calc(var(--gap-xs) / 2);
          border-radius: calc(var(--line-height) / 2);
          text-align: left;

          background: var(--theme-grey-lighter);

          > div {
            display: inline-block;
            width: calc(var(--line-height) - var(--gap-xs));
            height: calc(var(--line-height) - var(--gap-xs));
            border-radius: 100%;

            background: white;

            transition: transform var(--animation-duration);
          }
        }

        &[sd-on="true"] {
          > div {
            background: var(--theme-success-default);

            > div {
              transform: translateX(100%);
            }
          }
        }

        &[sd-inline="true"] {
          display: inline-block;
          padding: 0;
          border: none;
        }

        &[sd-inset="true"] {
          border: none;
        }

        &[sd-size="sm"] {
          padding: var(--gap-sm) 0;
        }

        &[sd-size="lg"] {
          font-size: var(--font-size-lg);
          padding: var(--gap-default) 0;
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="#{$key}"] {
            &[sd-on="true"] {
              > div {
                background: var(--theme-#{$key}-default);
              }
            }
          }
        }

        &[sd-disabled="true"] {
          > div {
            opacity: 0.5;

            > div {
              background: var(--theme-grey-default);
            }
          }
        }
      }
    `,
  ],
  template: `
    <div>
      <div></div>
    </div>`,
  host: {
    "[attr.sd-on]": "value()",
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-inset]": "inset()",
    "[attr.sd-size]": "size()",
    "[attr.sd-theme]": "theme()",
    "[attr.tabindex]": "'0'",
  },
})
export class SdSwitchControl {
  _value = input(false, { alias: "value", transform: transformBoolean });
  _valueChange = output<boolean>({ alias: "valueChange" });
  value = $model(this._value, this._valueChange);

  disabled = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  @HostListener("click", ["$event"])
  onClick(event: Event) {
    if (this.disabled()) return;

    event.preventDefault();
    event.stopPropagation();

    this.value.update((v) => !v);
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;

    if (event.key === " ") {
      this.value.update((v) => !v);
    }
  }
}
