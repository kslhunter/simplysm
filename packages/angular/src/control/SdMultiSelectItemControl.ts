import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  IterableDiffer,
  IterableDiffers
} from "@angular/core";
import {SdMultiSelectControl} from "./SdMultiSelectControl";

@Component({
  selector: "sd-multi-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-checkbox [value]="getIsSelected()" (valueChange)="setIsSelected($event)">
      <ng-content></ng-content>
    </sd-checkbox>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      padding: gap(xs) gap(sm);
      cursor: pointer;
      font-size: font-size(sm);

      &:hover {
        background: trans-color(dark);
      }

      /deep/ > sd-checkbox > label {
        padding: 0 !important;
      }
    }
  `]
})
export class SdMultiSelectItemControl implements DoCheck {
  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public value?: any;

  private readonly _iterableDiffer: IterableDiffer<any>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     public readonly elRef: ElementRef<HTMLElement>,
                     @Inject(forwardRef(() => SdMultiSelectControl))
                     private readonly _parentControl: SdMultiSelectControl) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((index, item) => item);
  }

  public ngDoCheck(): void {
    if (this._parentControl.value && this._iterableDiffer.diff(this._parentControl.value)) {
      this._cdr.markForCheck();
    }
  }

  public getIsSelected(): boolean {
    return this._parentControl.value ? this._parentControl.value!.includes(this.value) : false;
  }

  public setIsSelected(selected: boolean): void {
    if (selected) {
      if (!this._parentControl.value || !this._parentControl.value!.includes(this.value)) {
        this._parentControl.value = this._parentControl.value || [];
        this._parentControl.value!.push(this.value);
        this._parentControl.valueChange.emit(this._parentControl.value);
      }
    }
    else {
      if (this._parentControl.value!.includes(this.value)) {
        this._parentControl.value!.remove(this.value);
        this._parentControl.valueChange.emit(this._parentControl.value);
      }
    }
  }
}