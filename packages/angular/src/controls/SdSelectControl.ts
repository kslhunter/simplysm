import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  EventEmitter,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  Output,
  QueryList,
  TemplateRef,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {SdDropdownControl} from "./SdDropdownControl";
import {optional, Wait} from "@simplysm/common";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown #dropdown [disabled]="disabled">
      <div class="_sd-select-content" [innerHTML]="getContentHtml()"></div>
      <div class="_invalid-indicator"></div>
      <div class="_icon">
        <sd-icon [fw]="true" [icon]="'caret-down'"></sd-icon>
      </div>

      <sd-dropdown-popup>
        <ng-container *ngIf="!items">
          <ng-content></ng-content>
        </ng-container>
        <ng-container *ngIf="items">
          <sd-dock-container>
            <sd-dock>
              <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
            </sd-dock>
            <sd-pane>
              <ng-template #rowOfList let-items="items">
                <ng-container *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
                  <div class="_sd-select-item">
                    <ng-template [ngTemplateOutlet]="itemTemplateRef"
                                 [ngTemplateOutletContext]="{item: item}"></ng-template>

                    <ng-container *ngIf="children && children(i, item) && children(i, item).length > 0">
                      <div class="_children">
                        <ng-template [ngTemplateOutlet]="rowOfList"
                                     [ngTemplateOutletContext]="{items: children(i, item)}"></ng-template>
                      </div>
                    </ng-container>
                  </div>
                </ng-container>
              </ng-template>
              <ng-template [ngTemplateOutlet]="rowOfList"
                           [ngTemplateOutletContext]="{items: items}"></ng-template>
            </sd-pane>
          </sd-dock-container>
        </ng-container>
      </sd-dropdown-popup>
    </sd-dropdown>`
})
export class SdSelectControl implements AfterContentChecked {
  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(String)
  public keyProp?: string;

  @HostBinding("attr.sd-invalid")
  public get isInvalid(): boolean {
    return !!this.required && !this.value;
  }

  @ContentChildren(SdSelectItemControl, {descendants: true})
  public itemControls?: QueryList<SdSelectItemControl>;

  @ViewChild("dropdown")
  public dropdownControl?: SdDropdownControl;

  @ContentChild("item")
  public itemTemplateRef?: TemplateRef<any>;

  @ContentChild("header")
  public headerTemplateRef?: TemplateRef<any>;

  @Input()
  @SdTypeValidate(Array)
  public items?: any[];

  @Input()
  @SdTypeValidate(Function)
  public trackBy?: (index: number, item: any) => any;

  @Input()
  @SdTypeValidate(Function)
  public children?: (index: number, item: any) => any;

  public trackByItemFn(index: number, item: any): any {
    if (this.trackBy) {
      return this.trackBy(index, item);
    }
    else {
      return item;
    }
  }

  private readonly _itemControlsContentIterableDiffer: IterableDiffer<SdSelectItemControl>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _sanitizer: DomSanitizer) {
    this._itemControlsContentIterableDiffer = this._iterableDiffers.find([]).create((i, itemControl) => itemControl.labelContent);
  }

  public async ngAfterContentChecked(): Promise<void> {
    await Wait.true(() => !!this.itemControls, 1000);

    if (this.itemControls && this._itemControlsContentIterableDiffer.diff(this.itemControls.toArray())) {
      this._cdr.markForCheck();
    }
  }

  public getIsItemSelected(item: SdSelectItemControl): boolean {
    const thisKeyValue = this.keyProp && this.value ? this.value[this.keyProp] : this.value;
    const itemKeyValue = this.keyProp && item.value ? item.value[this.keyProp] : item.value;
    return thisKeyValue === itemKeyValue;
  }

  public getContentHtml(): SafeHtml {
    if (!this.itemControls) {
      return "";
    }

    return this._sanitizer.bypassSecurityTrustHtml(
      optional(
        this.itemControls.toArray().single(item => this.getIsItemSelected(item)),
        o => o.labelContent
      ) || ""
    );
  }

  public setValue(value: any): void {
    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(this.value);
    }

    if (this.dropdownControl) {
      this.dropdownControl.closePopup();
    }
  }
}
