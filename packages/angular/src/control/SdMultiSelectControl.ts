import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdMultiSelectItemControl} from "./SdMultiSelectItemControl";

@Component({
  selector: "sd-multi-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown [disabled]="disabled" (open)="open.emit()" (close)="close.emit()">
      <div #content></div>
      <div class="_icon">
        <sd-icon [fixedWidth]="true" [icon]="'angle-down'"></sd-icon>
      </div>

      <sd-dropdown-popup>
        <ng-content></ng-content>
      </sd-dropdown-popup>
    </sd-dropdown>`
})
export class SdMultiSelectControl implements DoCheck, OnInit, AfterContentChecked {
  @Input()
  @SdTypeValidate(Array)
  public value?: any[];

  @Output()
  public readonly valueChange = new EventEmitter<any[]>();

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(String)
  public keyProp?: string;

  @ContentChildren(SdMultiSelectItemControl, {descendants: true})
  public itemControls?: QueryList<SdMultiSelectItemControl>;

  private readonly _iterableDiffer: IterableDiffer<any>;

  @Output()
  public readonly open = new EventEmitter();

  @Output()
  public readonly close = new EventEmitter();

  @ViewChild("content")
  public contentElRef?: ElementRef<HTMLDivElement>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((index, item) => item);
  }

  public ngOnInit(): void {
    this._render();
  }

  public ngDoCheck(): void {
    if (this.value && this._iterableDiffer.diff(this.value)) {
      this._cdr.markForCheck();
    }
  }

  public ngAfterContentChecked(): void {
    this._render();
  }

  public getIsItemSelected(item: SdMultiSelectItemControl): boolean {
    if (!this.keyProp) {
      return this.value ? this.value.includes(item.value) : false;
    }
    else {
      return this.value ? this.value.map(item1 => item1[this.keyProp!]).includes(item.value[this.keyProp!]) : false;
    }
  }

  private _render(): void {
    if (!this.itemControls || !this.value || !this.contentElRef) return;

    let content = "";
    const selectedItemControls = this.itemControls.toArray().filter(item => this.getIsItemSelected(item));
    for (const selectedItemControl of selectedItemControls) {
      if (selectedItemControl.labelTemplateRef) {
        /*const embeddedView = selectedItemControl.labelTemplateRef.createEmbeddedView({});*/
        content += selectedItemControl.elRef.nativeElement.findAll("> sd-checkbox > label > ._content > ._labelTemplate")[0].innerHTML + ",\n";
      }
      else {
        content += selectedItemControl.elRef.nativeElement.findAll("> sd-checkbox > label > ._content > ._label")[0].innerHTML + ",\n";
      }
    }
    content = content.slice(0, -2);

    this.contentElRef.nativeElement.innerHTML = content;
  }
}