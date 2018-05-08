import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Inject,
  Input,
  Output
} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-tab",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdTabControl}]
})
export class SdTabControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(String)
  public value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string | undefined>();
}

@Component({
  selector: "sd-tab-item",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdTabItemControl}]
})
export class SdTabItemControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(String)
  public value?: string;

  public constructor(@Inject(SdTabControl)
                     private readonly _parentTabControl: SdTabControl) {
    super();
  }

  @HostBinding("attr.sd-selected")
  public get selected(): boolean {
    return this._parentTabControl.value === this.value;
  }

  @HostListener("click")
  public onClick(): void {
    this._parentTabControl.value = this.value;
    this._parentTabControl.valueChange.emit(this.value);
  }
}
