import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  TemplateRef
} from "@angular/core";
import {SdSelectControl} from "./SdSelectControl";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="_label">
      <ng-content></ng-content>
    </span>
    <span class="_labelTemplate" hidden *ngIf="labelTemplateRef">
      <ng-template [ngTemplateOutlet]="labelTemplateRef"></ng-template>
    </span>`
})
export class SdSelectItemControl {
  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public value?: any;

  @ContentChild("label")
  public labelTemplateRef?: TemplateRef<any>;

  @HostBinding("class._selected")
  public get isSelected(): boolean {
    const keyProp = this._selectControl.keyProp;
    const parentValue = this._selectControl.value;

    const parentKeyValue = keyProp && parentValue ? parentValue[keyProp] : parentValue;
    const itemKeyValue = keyProp && this.value ? this.value[keyProp] : this.value;
    return parentKeyValue === itemKeyValue;
  }

  public get content(): string {
    return this._elRef.nativeElement.innerHTML.trim();
  }

  public constructor(@Inject(forwardRef(() => SdSelectControl))
                     private readonly _selectControl: SdSelectControl,
                     private readonly _elRef: ElementRef<HTMLElement>) {
  }

  @HostListener("click", ["$event"])
  public onClick(): void {
    this._selectControl.setValue(this.value);
  }
}
