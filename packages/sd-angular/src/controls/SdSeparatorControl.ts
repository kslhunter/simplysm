import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-separator",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `│`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      padding: 0 var(--gap-lg);
    }
  `]
})
export class SdSeparatorControl {
}
