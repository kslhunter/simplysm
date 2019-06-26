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
  TemplateRef,
  ViewEncapsulation
} from "@angular/core";
import {SdMultiSelectControl} from "./SdMultiSelectControl";

@Component({
  selector: "sd-multi-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <sd-checkbox [value]="getIsSelected()" (valueChange)="setIsSelected($event)">
      <span class="_label">
        <ng-content></ng-content>
      </span>
      <span class="_labelTemplate" hidden *ngIf="labelTemplateRef">
        <ng-template [ngTemplateOutlet]="labelTemplateRef"></ng-template>
      </span>
    </sd-checkbox>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-multi-select-item {
      display: block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;
      transition: background .1s ease-in;
      background: white;

      &:hover {
        transition: background .1s ease-out;
        background: rgba(0, 0, 0, .07);
      }

      &:focus {
        outline: none;
        transition: background .1s ease-out;
        background: rgba(0, 0, 0, .07);
      }

      > sd-checkbox > label {
        padding: 0 !important;
      }

      &[hidden] {
        display: none;
      }
    }
  `]
})
export class SdMultiSelectItemControl implements DoCheck {
  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public value?: any;

  @ContentChild("label", {static: true})
  public labelTemplateRef?: TemplateRef<any>;

  private readonly _iterableDiffer: IterableDiffer<any>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     @Inject(forwardRef(() => SdMultiSelectControl))
                     private readonly _parentControl: SdMultiSelectControl,
                     public readonly elRef: ElementRef) {
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
