import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";
import { SdFlexControl } from "./sd-flex.control";

@Component({
  selector: "sd-flex-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-flex-item {
        display: block;
      }
    `,
  ],
  host: {
    "[style.flex]": "fill() ? '1 1 auto' : min() ? '0 0 0' : undefined",
    "[style.overflow]": "fill() ? 'auto' : undefined",
    "[style.padding-left]": "parent.padding() != null ? 'var(--gap-' + parent.padding() +')' : undefined",
    "[style.padding-right]": "parent.padding() != null ? 'var(--gap-' + parent.padding() +')' : undefined",
  },
})
export class SdFlexItemControl {
  parent = inject(SdFlexControl);
  min = input(false, { transform: transformBoolean });
  fill = input(false, { transform: transformBoolean });
}
