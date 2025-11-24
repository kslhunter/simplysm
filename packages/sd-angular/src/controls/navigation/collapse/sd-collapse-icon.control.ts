import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { $computed } from "../../../core/utils/bindings/$computed";

import { transformBoolean } from "../../../core/utils/transforms/tramsformBoolean";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAngularConfigProvider } from "../../../core/providers/sd-angular-config.provider";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [FaIconComponent],
  template: `
    <fa-icon [icon]="icon()" [fixedWidth]="true" />
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
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  icon = input(this.icons.angleDown);
  open = input(false, { transform: transformBoolean });
  openRotate = input(90);

  transform = $computed(() => (this.open() ? "rotate(" + this.openRotate() + "deg)" : ""));
}
