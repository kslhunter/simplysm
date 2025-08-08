import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    class: "sd-card",
  },
  template: `
    <ng-content></ng-content>
  `,
})
export class SdCardControl {}
