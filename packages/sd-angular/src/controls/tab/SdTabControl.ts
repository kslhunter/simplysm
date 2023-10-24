import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
  selector: "sd-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      border-bottom: 2px solid var(--theme-grey-lighter);

      @media not all and (pointer: coarse) {
        background: var(--theme-grey-lightest);
        padding-left: var(--gap-default);
        padding-top: 1px;
      }

      @media all and (pointer: coarse) {
        padding: 0 calc(var(--gap-default) + 1px) 0 calc(var(--gap-default) - 1px);
      }
    }
  `]
})
export class SdTabControl {
  @Input()
  value?: any;

  @Output()
  valueChange = new EventEmitter<any>();

  setValue(value: any) {
    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
  }
}
