import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
  ViewEncapsulation,
} from "@angular/core";
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

        > ng-icon {
          display: block;
        }
      }
    `,
  ],
  host: {
    "[style.transform]": "transformStyle()",
    "[style.transition]": "transitionStyle()",
  },
})
export class SdCollapseIcon {
  icon = input(tablerChevronDown);
  open = input(false, { transform: booleanAttribute });
  openRotate = input(90, { transform: numberAttribute });

  transformStyle = computed(() => {
    return this.open() ? `rotate(${this.openRotate()}deg)` : "";
  });

  transitionStyle = computed(() => {
    return this.open()
      ? "transform var(--sd-animation-duration) ease-out"
      : "transform var(--sd-animation-duration) ease-in";
  });
}
