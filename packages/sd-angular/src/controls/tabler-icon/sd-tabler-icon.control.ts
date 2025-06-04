import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTablerIcon } from "@simplysm/sd-tabler-icons";
import { injectElementRef } from "../../utils/injections/inject-element-ref";

/**
 * https://tabler.io/icons
 */
@Component({
  selector: "sd-tabler-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
  `,
  styles: [
    /* language=SCSS */ `
      sd-tabler-icon {
        font-size: 1em;

        > svg {
          height: 1.25em;
          vertical-align: -0.25em;
        }
      }
    `,
  ],
})
export class SdTablerIconControl {
  #elRef = injectElementRef();

  icon = input.required<SdTablerIcon>();

  constructor() {
    effect(() => {
      const elementDefs = this.icon();

      const svg = document.createElement("svg");
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      // svg.setAttribute("width", "24");
      // svg.setAttribute("height", "24");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");

      for (const elementDef of elementDefs) {
        const tag = elementDef[0];
        const attr = elementDef[1];

        const newEl = document.createElement(tag);
        for (const attrKey in attr) {
          newEl.setAttribute(attrKey, attr[attrKey]);
        }
        svg.append(newEl);
      }

      this.#elRef.nativeElement.innerHTML = svg.outerHTML;
    });
  }
}
