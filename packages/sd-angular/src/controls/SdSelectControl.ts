import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  TemplateRef,
  ViewChild
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdDropdownControl } from "./SdDropdownControl";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { ObjectUtil, Uuid } from "@simplysm/sd-core-common";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown #dropdown [disabled]="disabled" (open)="open.emit()"
                 [content.class]="contentClass">
      <div [innerHTML]="contentSafeInnerHTML"></div>
      <div class="_invalid-indicator"></div>
      <div class="_icon">
        <sd-icon fixedWidth icon="caret-down"></sd-icon>
      </div>

      <sd-dropdown-popup #dropdownPopup (keydown)="onPopupKeydown($event)">
        <ng-container *ngIf="!items">
          <sd-dock-container>
            <sd-dock class="sd-border-bottom-brightness-default sd-padding-sm-default" *ngIf="selectMode === 'multi'">
              <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
              <sd-gap width="sm"></sd-gap>
              <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
            </sd-dock>

            <sd-pane>
              <ng-content></ng-content>
            </sd-pane>
          </sd-dock-container>
        </ng-container>

        <ng-container *ngIf="items">
          <sd-dock-container>
            <sd-dock *ngIf="headerTemplateRef">
              <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
            </sd-dock>

            <sd-dock class="sd-border-bottom-brightness-default sd-padding-sm-default" *ngIf="selectMode === 'multi'">
              <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
              <sd-gap width="sm"></sd-gap>
              <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
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
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        border: 1px solid var(--sd-border-color);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;
        cursor: pointer;

        border-radius: 2px;

        > div:first-child {
          overflow: visible;
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
          opacity: .3;
        }

        &:hover > ._icon,
        &:focus > ._icon,
        &:active > ._icon {
          opacity: 1;
        }

        &:focus {
          outline-color: var(--theme-color-primary-default);
        }
      }

      &[sd-disabled=true] /deep/ > sd-dropdown > div {
        background: var(--theme-color-grey-lightest);
        color: var(--text-brightness-light);
        cursor: default;

        > ._icon {
          display: none;
        }
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

        min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-size=lg] /deep/ > sd-dropdown > div {
        padding: var(--gap-default) var(--gap-lg);
        padding-right: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px) !important;

        > ._icon {
          padding: var(--gap-default) 0;
          width: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }

        min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-inset=true] {
        min-width: auto;
        border-radius: 0;

        > /deep/ sd-dropdown > div {
          border: none;
          border-radius: 0;
          min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] > /deep/ sd-dropdown > div {
          min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=lg] > /deep/ sd-dropdown > div {
          min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        > /deep/ sd-dropdown > div:focus {
          outline: 1px solid var(--theme-color-primary-default);
          outline-offset: -1px;
        }

        &[sd-disabled=true] /deep/ > sd-dropdown > div {
          background: white;
          //color: var(--text-brightness-light);
          color: var(--text-brightness-default);
          cursor: default;
        }
      }
    }

    ._sd-select-item > ._children {
      border-left: var(--gap-xl) solid var(--theme-color-secondary-lightest);
    }
  `]
})
export class SdSelectControl implements DoCheck {
  public guid = Uuid.new().toString();

  @Input()
  public value: any | any[] | undefined;

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
  public keyProp: string | undefined;

  @ViewChild("dropdown", { static: true })
  public dropdownControl?: SdDropdownControl;

  @ViewChild("dropdownPopup", { static: true, read: ElementRef })
  public dropdownPopupElRef?: ElementRef<HTMLElement>;

  @ContentChild("item", { static: true })
  public itemTemplateRef?: TemplateRef<any>;

  @ContentChild("header", { static: true })
  public headerTemplateRef?: TemplateRef<any>;

  @ContentChild("before", { static: true })
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
  @SdInputValidate({ type: String, includes: ["single", "multi"], notnull: true })
  public selectMode: "single" | "multi" = "single";

  @Input("content.class")
  @SdInputValidate(String)
  public contentClass?: string;

  @Input()
  @SdInputValidate({ type: String, includes: ["vertical", "horizontal"] })
  public multiSelectionDisplayDirection?: "vertical" | "horizontal";

  @HostBinding("attr.sd-invalid")
  public get invalid(): boolean {
    return this.required === true && this.value === undefined;
  }

  public trackByItemFn = (index: number, item: any): any => this.trackByFn?.(index, item) ?? item;

  public itemControls: SdSelectItemControl[] = [];

  public constructor(private readonly _domSanitizer: DomSanitizer,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  private _prevItems: any[] | undefined;
  private _prevValue: any | any[] | undefined;

  public ngDoCheck(): void {
    if (!ObjectUtil.equal(this._prevItems, this.items)) {
      this._cdr.markForCheck();
      this._prevItems = ObjectUtil.clone(this.items);
      for (const itemControl of this.itemControls) {
        itemControl.markForCheck();
      }
    }
    if (!ObjectUtil.equal(this._prevValue, this.value)) {
      this._cdr.markForCheck();
      this._prevValue = ObjectUtil.clone(this.value);
      for (const itemControl of this.itemControls) {
        itemControl.markForCheck();
      }
    }
  }

  public get contentSafeInnerHTML(): SafeHtml {
    const selectedItemControls = this.itemControls.filter((itemControl) => this.getIsSelectedItemControl(itemControl));
    const selectedItemEls = selectedItemControls.map((item) => item.el);
    const innerHTML = selectedItemEls
      .map((el) => {
        if (this.getChildrenFn) {
          let cursorEl: HTMLElement | undefined = el;
          let resultHTML = "";
          while (true) {
            if (!cursorEl) break;

            resultHTML = (cursorEl.findFirst("> ._content")?.innerHTML ?? "") + (resultHTML ? " / " + resultHTML : "");
            cursorEl = cursorEl.findParent("._children")?.parentElement?.findFirst("sd-select-item");
          }

          return resultHTML;
        }
        else {
          return el.findFirst("> ._content")?.innerHTML ?? "";
        }
      })
      .map((item) => `<div style="display: inline-block">${item}</div>`)
      .join(this.multiSelectionDisplayDirection === "vertical" ? "<div class='sd-padding-sm-0'></div>" : ", ");

    return this._domSanitizer.bypassSecurityTrustHtml(innerHTML);
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();

      if (this.dropdownPopupElRef) {
        this.dropdownPopupElRef.nativeElement.findFocusableFirst()?.focus();
      }
    }
    else if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      if (this.dropdownControl) {
        this.dropdownControl.closePopup();
      }
    }
  }

  public onPopupKeydown(event: KeyboardEvent): void {
    if (
      !event.ctrlKey && !event.altKey && (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp"
      )
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (this.dropdownPopupElRef && document.activeElement instanceof HTMLElement) {
        const focusableEls = this.dropdownPopupElRef.nativeElement.findFocusableAll();
        const currIndex = focusableEls.indexOf(document.activeElement);

        if (event.key === "ArrowUp") {
          if (currIndex === 0) {
            if (this.dropdownControl?.controlEl) {
              this.dropdownControl.controlEl.focus();
            }
          }
          else {
            focusableEls[currIndex - 1].focus();
          }
        }
        else {
          if (typeof focusableEls[currIndex + 1] !== "undefined") {
            focusableEls[currIndex + 1].focus();
          }
        }
      }
    }
    else if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      if (this.dropdownControl) {
        this.dropdownControl.closePopup();

        if (this.dropdownControl.controlEl) {
          this.dropdownControl.controlEl.focus();
        }
      }
    }
  }

  public getIsSelectedItemControl(itemControl: SdSelectItemControl): boolean {
    if (this.selectMode === "multi") {
      const itemKeyValues = this.keyProp !== undefined && this.value !== undefined ? this.value.map((item: any) => item[this.keyProp!]) : this.value;
      const valKeyValue = this.keyProp !== undefined && itemControl.value !== undefined ? itemControl.value[this.keyProp] : itemControl.value;
      return itemKeyValues?.includes(valKeyValue) ?? false;
    }
    else {
      const itemKeyValue = this.keyProp !== undefined && this.value !== undefined ? this.value[this.keyProp] : this.value;
      const valKeyValue = this.keyProp !== undefined && itemControl.value !== undefined ? itemControl.value[this.keyProp] : itemControl.value;
      return itemKeyValue === valKeyValue;
    }
  }

  public onItemControlClick(itemControl: SdSelectItemControl, noClose?: boolean): void {
    if (this.selectMode === "multi") {
      const value = [...this.value];
      if ((this.value as any[]).includes(itemControl.value)) {
        value.remove(itemControl.value);
      }
      else {
        value.push(itemControl.value);
      }
      if (this.valueChange.observers.length > 0) {
        this.valueChange.emit(value);
      }
      else {
        this.value = value;
      }
    }
    else {
      if (this.value !== itemControl.value) {
        if (this.valueChange.observers.length > 0) {
          this.valueChange.emit(itemControl.value);
        }
        else {
          this.value = itemControl.value;
        }
      }

      if (this.dropdownControl && !noClose) {
        this.dropdownControl.closePopup();
      }
    }
    this._cdr.markForCheck();
  }

  public onItemControlInit(itemControl: SdSelectItemControl): void {
    if (!this.itemControls.includes(itemControl)) {
      this.itemControls.push(itemControl);
      this._cdr.detectChanges();
    }
  }

  public onItemControlDestroy(itemControl: SdSelectItemControl): void {
    if (this.itemControls.includes(itemControl)) {
      this.itemControls.remove(itemControl);
      this._cdr.markForCheck();
    }
  }

  public onItemControlContentChanged(itemControl: SdSelectItemControl): void {
    if (this.getIsSelectedItemControl(itemControl) || this.getChildrenFn) {
      this._cdr.detectChanges();
    }
  }

  public onSelectAllButtonClick(check: boolean): void {
    const value = check ? this.itemControls.map((item) => item.value) : [];

    if (this.valueChange.observers.length > 0) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
    for (const itemControl of this.itemControls) {
      itemControl.markForCheck();
    }
  }
}
