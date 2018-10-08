import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
  selector: "sd-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
    }
  `]
})
export class SdTabControl {
  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  public setValue(value: any): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}