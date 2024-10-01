import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $computed } from "../utils/$hooks";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [FaIconComponent],
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
  template: ` <fa-icon [icon]="icon()" [fixedWidth]="true" /> `,
})
export class SdCollapseIconControl {
  icons = inject(SdAngularConfigProvider).icons;

  icon = input(this.icons.angleDown);
  open = input(false);
  openRotate = input(90);

  transform$ = $computed(() => (this.open() ? "rotate(" + this.openRotate() + "deg)" : ""));

  constructor() {
    $hostBinding("attr.sd-open", this.open);
    $hostBinding("style.transform", this.transform$);
  }
}
