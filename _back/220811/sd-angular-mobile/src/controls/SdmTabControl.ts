import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "sdm-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      border-bottom: 2px solid var(--theme-color-grey-lighter);
      padding: 0 calc(var(--gap-default) + 1px) 0 calc(var(--gap-default) - 1px);
    }
  `]
})
export class SdmTabControl {
  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  public setValue(value: any): void {
    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
  }
}
