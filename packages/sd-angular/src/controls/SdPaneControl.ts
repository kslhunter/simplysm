import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: relative;
      height: 100%;
      overflow: auto;
    }
  `]
})
export class SdPaneControl {
}
