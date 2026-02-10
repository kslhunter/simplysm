import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $computed } from "../../../core/utils/bindings/$computed";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { NgIcon } from "@ng-icons/core";
import { tablerChevronDown } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgIcon],
  template: `
    <ng-icon [svg]="icon()" />
  `,
  styles: [
    /* language=SCSS */ `
      sd-collapse-icon {
        display: inline-block;
        transition: transform 0.1s ease-in;

        &[data-sd-open="true"] {
          transition: transform 0.1s ease-out;
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-open]": "open()",
    "[style.transform]": "transform()",
  },
})
export class SdCollapseIconControl {
  icon = input(tablerChevronDown);
  open = input(false, { transform: transformBoolean });
  openRotate = input(90);

  transform = $computed(() => (this.open() ? "rotate(" + this.openRotate() + "deg)" : ""));
}
