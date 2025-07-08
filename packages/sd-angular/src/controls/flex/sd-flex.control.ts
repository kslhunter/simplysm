import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";

@Component({
  selector: "sd-flex",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-flex {
        //flex-wrap: nowrap;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  host: {
    "[style.display]": "inline() ? 'flex-inline' : 'flex'",
    // "[style.white-space]": "inline() ? 'nowrap' : undefined",
    "[style.flex-direction]": "vertical() ? 'column' : 'row'",
    "[style.gap]": "gap() != null ? 'var(--gap-' + gap() +')' : undefined",
    "[style.padding-top]": "padding() != null ? 'var(--gap-' + padding() +')' : undefined",
    "[style.padding-bottom]": "padding() != null ? 'var(--gap-' + padding() +')' : undefined",
    "[style.justify-content]": "mainAlign() != null ? mainAlign() : undefined",
    "[style.align-items]": "crossAlign() != null ? crossAlign() : undefined",
  },
})
export class SdFlexControl {
  vertical = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });
  gap = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  padding = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();

  mainAlign = input<"start" | "end" | "center">();
  crossAlign = input<"start" | "end" | "center">();
}
