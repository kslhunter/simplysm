import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sdm-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      background: white;
      overflow: hidden;
      border-radius: var(--gap-lg);
    }
  `]
})
export class SdmCardControl {
}
