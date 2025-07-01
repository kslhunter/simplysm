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
        flex-wrap: nowrap;
      }
    `,
  ],
  host: {
    "[style.display]": "inline() ? 'flex-inline' : 'flex'",
    "[style.white-space]": "inline() ? 'nowrap' : undefined",
    "[style.flex-direction]": "vertical() ? 'column' : 'row'",
    "[style.height]": "fill() && vertical() ? '100%' : undefined",
    "[style.width]": "fill() && !vertical() ? '100%' : undefined",
    "[style.gap]": "gap() != null ? 'var(--gap-' + gap() +')' : undefined",
  },
})
export class SdFlexControl {
  vertical = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });
  fill = input(false, { transform: transformBoolean });
  gap = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
}
