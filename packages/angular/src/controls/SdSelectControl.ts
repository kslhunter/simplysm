import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  Output,
  TemplateRef,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {SdDropdownControl} from "./SdDropdownControl";
import {optional} from "@simplysm/common";

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

      <sd-dropdown-popup #popup>
        <ng-container *ngIf="!items">
          <ng-content></ng-content>
        </ng-container>
        <ng-container *ngIf="items">
          <sd-dock-container>
            <sd-dock>
              <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
            </sd-dock>
            <sd-pane>
              <ng-template [ngTemplateOutlet]="beforeTemplateRef"></ng-template>
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
export class SdSelectControl implements DoCheck, AfterContentChecked {
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

  @ViewChild("dropdown")
  public dropdownControl?: SdDropdownControl;

  @ViewChild("popup", {read: ElementRef})
  public popupElRef?: ElementRef<HTMLElement>;

  @ContentChild("item")
  public itemTemplateRef?: TemplateRef<any>;

  @ContentChild("header")
  public headerTemplateRef?: TemplateRef<any>;

  @ContentChild("before")
  public beforeTemplateRef?: TemplateRef<any>;

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
      return this.trackBy(index, item) || item;
    }
    else {
      return item;
    }
  }

  private readonly _iterableDiffer: IterableDiffer<any>;
  private readonly _itemElsIterableDiffer: IterableDiffer<any>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _sanitizer: DomSanitizer) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((index, item) => this.trackByItemFn(index, item));
    this._itemElsIterableDiffer = this._iterableDiffers.find([]).create();
  }

  public ngDoCheck(): void {
    if (this.items && this._iterableDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }
  }

  public ngAfterContentChecked(): void {
    if (this.popupElRef) {
      const itemEls = this.popupElRef.nativeElement.findAll("sd-select-item");
      if (itemEls && this._itemElsIterableDiffer.diff(itemEls)) {
        this._cdr.markForCheck();
      }
    }
  }

  public getContentHtml(): SafeHtml {
    if (!this.popupElRef) return "";

    const itemEls = this.popupElRef.nativeElement.findAll("sd-select-item");

    return this._sanitizer.bypassSecurityTrustHtml(
      optional(
        itemEls.find(itemEl => itemEl.classList.contains("_selected")),
        itemEl => itemEl.findAll("> ._labelTemplate").length > 0
          ? itemEl.findAll("> ._labelTemplate")[0].innerHTML.trim()
          : itemEl.findAll("> ._label")[0].innerHTML.trim()
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
