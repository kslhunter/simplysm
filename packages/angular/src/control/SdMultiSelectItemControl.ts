import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  IterableDiffer,
  IterableDiffers,
  TemplateRef
} from "@angular/core";
import {SdMultiSelectControl} from "./SdMultiSelectControl";

@Component({
  selector: "sd-multi-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-checkbox [value]="getIsSelected()" (valueChange)="setIsSelected($event)">
      <span class="_label">
        <ng-content></ng-content>
      </span>
      <span class="_labelTemplate" hidden *ngIf="labelTemplateRef">
        <ng-template [ngTemplateOutlet]="labelTemplateRef"></ng-template>
      </span>
    </sd-checkbox>`
})
export class SdMultiSelectItemControl implements DoCheck {
  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public value?: any;

  @ContentChild("label")
  public labelTemplateRef?: TemplateRef<any>;

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
    return this._parentControl.getIsItemSelected(this);
  }

  public setIsSelected(selected: boolean): void {
    if (selected) {
      if (!this.getIsSelected()) {
        this._parentControl.value = this._parentControl.value || [];
        this._parentControl.value!.push(this.value);
        this._parentControl.valueChange.emit(this._parentControl.value);
      }
    }
    else {
      if (this.getIsSelected()) {
        if (this._parentControl.keyProp) {
          this._parentControl.value!.remove((item: any) => item[this._parentControl.keyProp!] === this.value[this._parentControl.keyProp!]);
        }
        else {
          this._parentControl.value!.remove(this.value);
        }
        this._parentControl.valueChange.emit(this._parentControl.value);
      }
    }
  }
}