import { ChangeDetectionStrategy, Component, HostListener, input, model, ViewEncapsulation } from "@angular/core";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";

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

        @each $key, $val in map-get($vars, theme) {
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
  template: ` <div>
    <div></div>
  </div>`,
})
export class SdSwitchControl {
  value = model(false);

  disabled = input(false);
  inline = input(false);
  inset = input(false);

  size = input<"sm" | "lg">();
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  constructor() {
    $hostBinding("attr.sd-on", this.value);
    $hostBinding("attr.sd-disabled", this.disabled);
    $hostBinding("attr.sd-inline", this.inline);
    $hostBinding("attr.sd-inset", this.inset);
    $hostBinding("attr.sd-size", this.size);
    $hostBinding("attr.sd-theme", this.theme);
    $hostBinding("attr.tabindex", { value: 0 });
  }

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
