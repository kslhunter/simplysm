import { Directive, input } from "@angular/core";

@Directive({
  selector: "[sdAnimationDelay]",
  standalone: true,
  host: {
    "[style.animation-delay]": "sdAnimationDelay() + 'ms'",
  },
})
export class SdAnimationDelayDirective {
  sdAnimationDelay = input.required<number>();
}
