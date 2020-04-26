import {
  AfterViewInit,
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
import {SdInputValidate} from "../commons/SdInputValidate";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown #dropdown [disabled]="disabled" (open)="open.emit()">
      <div [innerHTML]="contentHTML"></div>
      <div class="_invalid-indicator"></div>
      <div class="_icon">
        <sd-icon fixedWidth icon="caret-down"></sd-icon>
      </div>

      <sd-dropdown-popup #popup>
        <ng-container *ngIf="!items">
          <ng-content></ng-content>
        </ng-container>
        <ng-container *ngIf="items">
          <sd-dock-container>
            <sd-dock class="sd-border-bottom-default">
              <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
            </sd-dock>

            <sd-pane>
              <ng-template [ngTemplateOutlet]="beforeTemplateRef"></ng-template>
              <ng-template #rowOfList let-items="items">
                <ng-container *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
                  <div class="_sd-select-item">
                    <ng-template [ngTemplateOutlet]="itemTemplateRef"
                                 [ngTemplateOutletContext]="{item: item}"></ng-template>

                    <ng-container
                      *ngIf="getChildrenFn && getChildrenFn(i, item) && getChildrenFn!(i, item).length > 0">
                      <div class="_children">
                        <ng-template [ngTemplateOutlet]="rowOfList"
                                     [ngTemplateOutletContext]="{items: getChildrenFn(i, item)}"></ng-template>
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
    </sd-dropdown>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      width: 100%;
      min-width: 120px;

      /deep/ > sd-dropdown > div {
        @include form-control-base();

        background: var(--theme-color-secondary-lightest);
        display: block;
        overflow: visible;
        padding-right: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px) !important;
        height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        border: 1px solid var(--sd-border-color);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;
        cursor: pointer;

        > div:first-child {
          overflow: hidden;
          white-space: nowrap;
        }

        > ._icon {
          position: absolute;
          top: -1px;
          right: -1px;
          padding: var(--gap-sm) 0;
          width: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
          text-align: center;
          pointer-events: none;
        }

        &:focus {
          outline-color: var(--theme-color-primary-default);
        }
      }

      &[sd-disabled=true] /deep/ > sd-dropdown > div {
        background: var(--theme-color-grey-lightest);
        color: var(--text-brightness-light);
        cursor: default;
      }

      &[sd-invalid=true] /deep/ > sd-dropdown > div > ._invalid-indicator {
        @include invalid-indicator();
      }

      &[sd-inline=true] {
        display: inline-block;
        width: auto;
        vertical-align: top;
      }

      &[sd-size=sm] /deep/ > sd-dropdown > div {
        padding: var(--gap-xs) var(--gap-sm);
        padding-right: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px) !important;

        > ._icon {
          padding: var(--gap-xs) 0;
          width: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }

        height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-size=lg] /deep/ > sd-dropdown > div {
        padding: var(--gap-default) var(--gap-lg);
        padding-right: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px) !important;

        > ._icon {
          padding: var(--gap-default) 0;
          width: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }

        height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-inset=true] {
        min-width: auto;

        > /deep/ sd-dropdown > div {
          border: none;
          border-radius: 0;
          height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] > /deep/ sd-dropdown > div {
          height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=lg] > /deep/ sd-dropdown > div {
          height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        > /deep/ sd-dropdown > div:focus {
          outline: 1px solid var(--theme-color-primary-default);
          outline-offset: -1px;
        }

        &[sd-disabled=true] /deep/ > sd-dropdown > div {
          background: white !important;
          color: var(--text-brightness-light);
          cursor: default;
        }
      }
    }

    ._sd-select-item > ._children {
      border-left: var(--gap-xl) solid var(--theme-color-secondary-lightest);
    }
  `]
})
export class SdSelectControl implements DoCheck, AfterViewInit {
  @Input()
  public set value(value: any | any[] | undefined) {
    if (this._value !== value) {
      this._value = value;
      this._refreshContent();
    }
  }

  public get value(): any | any[] | undefined {
    return this._value;
  }

  private _value?: any | any[];

  @Output()
  public readonly valueChange = new EventEmitter<any | any[]>();

  @Input()
  @SdInputValidate(Boolean)
  public required?: boolean;

  @Input()
  @HostBinding("attr.sd-disabled")
  @SdInputValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdInputValidate(String)
  public set keyProp(value: string | undefined) {
    this._keyProp = value;
    this._refreshContent();
  }

  public get keyProp(): string | undefined {
    return this._keyProp;
  }

  private _keyProp?: string;

  @ViewChild("dropdown", {static: true})
  public dropdownControl?: SdDropdownControl;

  @ViewChild("popup", {static: true, read: ElementRef})
  public popupElRef?: ElementRef<HTMLElement>;

  @ContentChild("item", {static: true})
  public itemTemplateRef?: TemplateRef<any>;

  @ContentChild("header", {static: true})
  public headerTemplateRef?: TemplateRef<any>;

  @ContentChild("before", {static: true})
  public beforeTemplateRef?: TemplateRef<any>;

  @Input()
  @SdInputValidate(Array)
  public items?: any[];

  @Input()
  @SdInputValidate(Function)
  public trackByFn?: (index: number, item: any) => any;

  @Input()
  @SdInputValidate(Function)
  public getChildrenFn?: (index: number, item: any) => any;

  @Output()
  public readonly open = new EventEmitter();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate({type: String, includes: ["single", "multi"], notnull: true})
  public set selectMode(value: "single" | "multi") {
    if (this._selectMode !== value) {
      this._selectMode = value;
      this._refreshContent();
    }
  }

  public get selectMode(): "single" | "multi" {
    return this._selectMode;
  }

  private _selectMode: "single" | "multi" = "single";

  public trackByItemFn = (index: number, item: any) => {
    if (this.trackByFn) {
      return this.trackByFn(index, item) ?? item;
    }
    else {
      return item;
    }
  };

  public itemControls: SdSelectItemControl[] = [];
  public contentHTML?: SafeHtml;

  private readonly _itemsIterableDiffer: IterableDiffer<any>;
  private readonly _valueIterableDiffer: IterableDiffer<any>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _domSanitizer: DomSanitizer) {
    this._itemsIterableDiffer = this._iterableDiffers.find([]).create((index, item) => this.trackByItemFn(index, item));
    this._valueIterableDiffer = this._iterableDiffers.find([]).create();
  }

  public ngDoCheck(): void {
    if (this.items && this._itemsIterableDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }
    if (this._value instanceof Array && this._valueIterableDiffer.diff(this._value)) {
      this._cdr.markForCheck();
    }
  }

  public getIsSelectedItemControl(itemControl: SdSelectItemControl): boolean {
    if (this._selectMode === "multi") {
      const parentKeyValues = this._keyProp !== undefined && this._value !== undefined ? this._value.map((item: any) => item[this._keyProp!]) : this._value;
      const itemKeyValue = this._keyProp !== undefined && itemControl.value !== undefined ? itemControl.value[this._keyProp] : itemControl.value;
      return parentKeyValues.includes(itemKeyValue);
    }
    else {
      const parentKeyValue = this._keyProp !== undefined && this._value !== undefined ? this._value[this._keyProp] : this._value;
      const itemKeyValue = this._keyProp !== undefined && itemControl.value !== undefined ? itemControl.value[this._keyProp] : itemControl.value;
      return parentKeyValue === itemKeyValue;
    }
  }

  public onItemControlClick(itemControl: SdSelectItemControl): void {
    if (this._selectMode === "multi") {
      this._value = this._value ?? [];
      if ((this._value as any[]).includes(itemControl.value)) {
        this._value.remove(itemControl.value);
      }
      else {
        this._value.push(itemControl.value);
      }
      this.valueChange.emit(this._value);
      this._refreshContent();
      this._cdr.markForCheck();
    }
    else {
      if (this._value !== itemControl.value) {
        this._value = itemControl.value;
        this.valueChange.emit(this._value);
        this._refreshContent();
        this._cdr.markForCheck();
      }

      if (this.dropdownControl) {
        this.dropdownControl.closePopup();
      }
    }
  }

  public onItemControlContentChanged(itemControl: SdSelectItemControl): void {
    if (!this.itemControls.includes(itemControl)) {
      this.itemControls.push(itemControl);
      this._cdr.markForCheck();
    }

    if (this.getIsSelectedItemControl(itemControl) || this.getChildrenFn) {
      this._refreshContent();
      this._cdr.markForCheck();
    }
  }

  public ngAfterViewInit(): void {
    this._refreshContent();
  }

  private _refreshContent(): void {
    const selectedItemControls = this.itemControls?.filter(itemControl => this.getIsSelectedItemControl(itemControl)) ?? [];
    const selectedItemEls = selectedItemControls.map(item => item.el);
    const contentHTML = selectedItemEls.map(el => {
      if (this.getChildrenFn) {
        let cursorEl: HTMLElement | undefined = el;
        let resultHTML = "";
        while (true) {
          if (!cursorEl) break;

          resultHTML = (cursorEl.findFirst("> ._content")?.innerHTML ?? "") + (Boolean(resultHTML) ? " / " + resultHTML : "");
          cursorEl = cursorEl.findParent("._children")?.parentElement?.findFirst("sd-select-item");
        }

        return resultHTML;
      }
      else {
        return el.findFirst("> ._content")?.innerHTML ?? "";
      }
    }).join(", ");

    this.contentHTML = this._domSanitizer.bypassSecurityTrustHtml(contentHTML);
  }

  /*private _getParentItemControl(itemControl: SdSelectItemControl): SdSelectItemControl | undefined {
    if (!this.getChildrenFn) return undefined;
    if (!this.items) return undefined;

    return this.itemControls?.find((item, i) => (
      item.value !== undefined &&
      this.getChildrenFn!(i, item.value) !== undefined &&
      this.getChildrenFn!(i, item.value).includes(itemControl.value) === true
    ));
  }*/

  /*private _refreshContent(): void {
    if (this._contentEl === undefined || this._popupEl === undefined) return;

    const selectedItemEls = this._popupEl.findAll("sd-select-item")
      .filter(item => (
        (
          this.selectMode === "single" &&
          (
            (
              !Boolean(this.value) &&
              !Boolean(item.getAttribute("sd-value-json"))
            ) ||
            item.getAttribute("sd-value-json") === JsonConvert.stringify(this.value)
          )
        ) ||
        (
          this.selectMode === "multi" &&
          this.value instanceof Array &&
          this.value.some((v: any) => (
            (
              !Boolean(v) &&
              !Boolean(item.getAttribute("sd-value-json"))
            ) ||
            JsonConvert.stringify(v) === item.getAttribute("sd-value-json")
          ))
        )
      ));

    const innerHTMLs: string[] = [];
    if (selectedItemEls.length < 1) {
    }
    else if (this.getChildrenFn) {
      for (const selectedItemEl of selectedItemEls) {
        let cursorEl: HTMLElement | undefined = selectedItemEl;
        let innerHTML = "";
        while (true) {
          if (!cursorEl) break;

          const labelTemplateEl = cursorEl.findAll("> ._labelTemplate")[0];
          const labelEl = labelTemplateEl !== undefined ? labelTemplateEl : cursorEl.findAll("> ._label")[0];
          innerHTML = labelEl.innerHTML + (Boolean(innerHTML) ? " / " + innerHTML : "");

          cursorEl = cursorEl.findParent("._children")?.parentElement?.findFirst("sd-select-item");
        }

        innerHTMLs.push(innerHTML);
      }
    }
    else {
      for (const selectedItemEl of selectedItemEls) {
        const labelTemplateEl = selectedItemEl.findAll("> ._labelTemplate")[0];
        const labelEl = labelTemplateEl !== undefined ? labelTemplateEl : selectedItemEl.findAll("> ._label")[0];
        innerHTMLs.push(labelEl.innerHTML);
      }
    }

    this._contentEl.innerHTML = innerHTMLs.join(", ");
  }*/

  /*private _refreshInvalid(): void {
    if (this.required && this.value === undefined) {
      this._el.setAttribute("sd-invalid", "true");
    }
    else {
      this._el.setAttribute("sd-invalid", "false");
    }
  }*/
}
