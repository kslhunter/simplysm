import {ChangeDetectionStrategy, Component, Input} from "@angular/core";

@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      background: white;
    }
  `]
})
export class SdViewControl {
  @Input()
  public value?: any;
}
