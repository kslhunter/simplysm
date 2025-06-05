import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed } from "../utils/bindings/$computed";

import { transformBoolean } from "../utils/type-tramsforms";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";


@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    FaIconComponent,
  ],
  styles: [/* language=SCSS */ `
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
    <fa-icon [icon]="icon()" [fixedWidth]="true" />
  `,
  host: {
    "[attr.sd-open]": "open()",
    "[style.transform]": "transform()",
  },
})
export class SdCollapseIconControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  icon = input(this.icons.angleDown);
  open = input(false, { transform: transformBoolean });
  openRotate = input(90);

  transform = $computed(() => (this.open() ? "rotate(" + this.openRotate() + "deg)" : ""));
}
