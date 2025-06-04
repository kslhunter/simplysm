import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdTablerIcon } from "@simplysm/sd-tabler-icons";

@Component({
  selector: "sd-tabler-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <svg
      #svgEl
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></svg>
  `,
  styles: [
    /* language=SCSS */ `
      sd-tabler-icon {
        font-size: 1em;

        > svg {
          height: 1em;
          vertical-align: calc((1 - var(--line-height)) / 2);
        }
      }
    `,
  ],
})
export class SdTablerIconControl {
  icon = input.required<SdTablerIcon>();

  svgEl = viewChild.required<any, ElementRef<SVGElement>>("svgEl", { read: ElementRef });

  constructor() {
    effect(() => {
      const elementDefs = this.icon();
      const newEls: Element[] = [];
      for (const elementDef of elementDefs) {
        const tag = elementDef[0];
        const attr = elementDef[1];

        const newEl = document.createElement(tag);
        for (const attrKey in attr) {
          newEl.setAttribute(attrKey, attr[attrKey]);
        }
        newEls.push(newEl);
      }

      this.svgEl().nativeElement.innerHTML = "";
      this.svgEl().nativeElement.append(...newEls);
    });
  }
}
