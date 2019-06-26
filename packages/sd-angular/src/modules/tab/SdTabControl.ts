import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-tab {
      display: block;
      background: var(--theme-grey-lightest);
      border-bottom: 2px solid var(--theme-grey-lighter);
      padding-left: var(--gap-default);
      padding-top: 1px;
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
