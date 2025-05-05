import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed } from "../utils/hooks/hooks";
import { transformBoolean } from "../utils/type-tramsforms";
import { SdIconControl } from "./sd-icon.control";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdIconControl
  ],
  styles: [/* language=SCSS */ `
    sd-collapse-icon {
      display: inline-block;
      transition: transform 0.1s ease-in;

      &[sd-open="true"] {
        transition: transform 0.1s ease-out;
      }
    }
  `
  ],
  template: `
    <sd-icon [icon]="icon()" fixedWidth />
  `,
  host: {
    "[attr.sd-open]": "open()",
    "[style.transform]": "transform()"
  }
})
export class SdCollapseIconControl {
 protected icons = inject(SdAngularConfigProvider).icons;

  icon = input(this.icons.angleDown);
  open = input(false, { transform: transformBoolean });
  openRotate = input(90);

  transform = $computed(() => (this.open() ? "rotate(" + this.openRotate() + "deg)" : ""));
}
