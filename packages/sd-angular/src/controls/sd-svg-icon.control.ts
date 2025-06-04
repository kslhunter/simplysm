import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-svg-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ``,
  styles: [/* language=SCSS */ `
    sd-svg-icon {
      font-size: 1em;

      > svg {
        height: 1em;
      }
    }
  `],
})
export class SdSvgIconControl {
  #elRef = inject(ElementRef);

  svg = input.required<string>();

  constructor() {
    effect(() => {
      const svg = this.svg();

      queueMicrotask(async () => {
        const res = await fetch(svg);
        let text = await res.text();
        text = text.replaceAll(/height="([^"]*)"/g, "").replaceAll(/width="([^"]*)"/g, "");
        this.#elRef.nativeElement.innerHTML = text;
      });
    });
  }
}
