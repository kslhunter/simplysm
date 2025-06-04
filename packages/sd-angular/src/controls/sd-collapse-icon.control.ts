import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $computed } from "../utils/bindings/$computed";
import { transformBoolean } from "../utils/type-tramsforms";
import { taChevronDown } from "@simplysm/sd-tabler-icons/icons/ta-chevron-down";
import { SdTablerIconControl } from "./tabler-icon/sd-tabler-icon.control";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTablerIconControl],
  styles: [
    /* language=SCSS */ `
      sd-collapse-icon {
        display: inline-block;
        transition: transform 0.1s ease-in;

        &[sd-open="true"] {
          transition: transform 0.1s ease-out;
        }
      }
    `,
  ],
  template: `
    <sd-tabler-icon [icon]="icon()" />
  `,
  host: {
    "[attr.sd-open]": "open()",
    "[style.transform]": "transform()",
  },
})
export class SdCollapseIconControl {
  icon = input(taChevronDown);
  open = input(false, { transform: transformBoolean });
  openRotate = input(90);

  transform = $computed(() => (this.open() ? "rotate(" + this.openRotate() + "deg)" : ""));
}
