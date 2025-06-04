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
})
export class SdMatIconComponent {
  #elRef = inject(ElementRef);

  svg = input.required<string>();

  constructor() {
    effect(() => {
      const svg = this.svg();

      queueMicrotask(async () => {
        const res = await fetch(svg);
        this.#elRef.nativeElement.innerHTML = await res.text();
      });
    });
  }
}
