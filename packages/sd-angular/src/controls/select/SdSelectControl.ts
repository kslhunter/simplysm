import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  Injector,
  Input,
  Output,
  QueryList,
  TemplateRef,
  ViewChild
} from "@angular/core";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {SdDropdownControl} from "../dropdown/SdDropdownControl";
import {faCaretDown} from "@fortawesome/pro-duotone-svg-icons/faCaretDown";
import {SdItemOfTemplateContext, SdItemOfTemplateDirective} from "../../directives/SdItemOfTemplateDirective";
import {coercionBoolean, getSdFnCheckData, TSdFnInfo} from "../../utils/commons";
import {SdNgHelper} from "../../utils/SdNgHelper";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown #dropdown [disabled]="disabled"
                 [contentClass]="contentClass"
                 [contentStyle]="contentStyle">
      <div #contentEl></div>
      <div class="_invalid-indicator"></div>
      <div class="_icon">
        <sd-icon [icon]="faCaretDown" fixedWidth/>
      </div>

      <sd-dropdown-popup #dropdownPopup (keydown.outside)="onPopupKeydownOutside($event)">
        <ng-container *ngIf="!items">
          <sd-dock-container>
            <sd-dock class="bdb bdb-trans-default p-sm-default"
                     *ngIf="selectMode === 'multi' && !hideSelectAll">
              <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
              <sd-gap width="sm"></sd-gap>
              <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
            </sd-dock>

            <sd-dock *ngIf="headerTemplateRef">
              <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
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

            <sd-dock class="bdb bdb-trans-default p-sm-default"
                     *ngIf="selectMode === 'multi' && !hideSelectAll">
              <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
              <sd-gap width="sm"></sd-gap>
              <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
            </sd-dock>

            <sd-pane>
              <ng-template [ngTemplateOutlet]="beforeTemplateRef"></ng-template>
              <ng-template #rowOfList [typed]="rowOfListType" let-items="items" let-depth="depth">
                <ng-container *ngFor="let item of items; let index = index; trackBy: trackByFn[0]">
                  <div class="_sd-select-item">
                    <ng-template [ngTemplateOutlet]="itemTemplateRef"
                                 [ngTemplateOutletContext]="{item: item, index: index, depth: depth}"></ng-template>

                    <ng-container
                      *ngIf="getChildrenFn?.[0] && getChildrenFn![0](index, item, depth) && getChildrenFn![0](index, item, depth).length > 0">
                      <div class="_children">
                        <ng-template [ngTemplateOutlet]="rowOfList"
                                     [ngTemplateOutletContext]="{items: getChildrenFn![0](index, item, depth), depth: depth + 1}"></ng-template>
                      </div>
                    </ng-container>
                  </div>
                </ng-container>
              </ng-template>
              <ng-template [ngTemplateOutlet]="rowOfList"
                           [ngTemplateOutletContext]="{items: items, depth: 0}"></ng-template>
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

      ::ng-deep > sd-dropdown > div {
        @include form-control-base();

        position: relative;
        background: var(--theme-secondary-lightest);
        display: block;
        overflow: visible;
        padding-right: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px) !important;
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        // border:1 px solid var(--border-color-default);
        border: 1px solid var(--trans-light);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;
        cursor: pointer;

        border-radius: var(--border-radius-default);

        @media all and (pointer: coarse) {
          @include active-effect(true);
        }

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
          outline-color: var(--theme-primary-default);
        }
      }

      &[sd-disabled=true] ::ng-deep > sd-dropdown > div {
        background: var(--theme-grey-lightest);
        color: var(--text-trans-light);
        cursor: default;

        @media all and (pointer: coarse) {
          @include active-effect(false);
        }

        > ._icon {
          display: none;
        }
      }

      &[sd-invalid=true] ::ng-deep > sd-dropdown > div > ._invalid-indicator {
        display: block;
        position: absolute;
        background: var(--theme-danger-default);

        top: var(--gap-xs);
        left: var(--gap-xs);
        border-radius: 100%;
        width: var(--gap-sm);
        height: var(--gap-sm);
      }

      &[sd-inline=true] {
        display: inline-block;
        width: auto;
        vertical-align: top;
      }

      &[sd-size=sm] ::ng-deep > sd-dropdown > div {
        padding: var(--gap-xs) var(--gap-sm);
        padding-right: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px) !important;

        > ._icon {
          padding: var(--gap-xs) 0;
          width: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }

        min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-size=lg] ::ng-deep > sd-dropdown > div {
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

        > ::ng-deep sd-dropdown > div {
          border: none;
          border-radius: 0;
          min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] > ::ng-deep sd-dropdown > div {
          min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=lg] > ::ng-deep sd-dropdown > div {
          min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        > ::ng-deep sd-dropdown > div:focus {
          outline: 1px solid var(--theme-primary-default);
          outline-offset: -1px;
        }

        &[sd-disabled=true] ::ng-deep > sd-dropdown > div {
          background: white;
          color: var(--text-trans-default);
          cursor: default;
        }
      }
    }

    ._sd-select-item > ._children {
      border-left: var(--gap-xl) solid var(--theme-secondary-lightest);
    }
  `]
})
export class SdSelectControl<T> implements DoCheck {
  @Input()
  value!: any | any[];

  @Output()
  valueChange = new EventEmitter<any | any[]>();

  @Input({transform: coercionBoolean})
  required = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input()
  keyProp?: string;

  @ViewChild("dropdown", {static: true})
  dropdownControl?: SdDropdownControl;

  @ViewChild("dropdownPopup", {static: true, read: ElementRef})
  dropdownPopupElRef?: ElementRef<HTMLElement>;

  @ContentChild(SdItemOfTemplateDirective, {static: true, read: TemplateRef})
  itemTemplateRef: TemplateRef<SdItemOfTemplateContext<any>> | null = null;

  @ContentChild("header", {static: true})
  headerTemplateRef: TemplateRef<void> | null = null;

  @ContentChild("before", {static: true})
  beforeTemplateRef: TemplateRef<void> | null = null;

  @ContentChildren(SdSelectItemControl)
  itemControls?: QueryList<SdSelectItemControl<T>>;

  @Input()
  items?: T[];

  @Input()
  trackByFn: TSdFnInfo<(index: number, item: T) => any> = [(index, item) => item];

  @Input()
  getChildrenFn?: TSdFnInfo<(index: number, item: T, depth: number) => T[]>;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inline")
  inline = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  @Input()
  selectMode: "single" | "multi" = "single";

  @Input()
  contentClass?: string;

  @Input()
  contentStyle?: string;

  @Input()
  multiSelectionDisplayDirection?: "vertical" | "horizontal";

  @Input({transform: coercionBoolean})
  hideSelectAll = false;

  @Input()
  placeholder?: string;

  @HostBinding("attr.sd-invalid")
  public get invalid(): boolean {
    return this.required && this.value === undefined;
  }

  @ViewChild("contentEl", {static: true})
  contentElRef!: ElementRef<HTMLElement>;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheckOutside(run => {
      run({
        itemControls: [this.itemControls, "one"],
        selectMode: [this.selectMode],
        keyProp: [this.keyProp],
        value: [this.value],
        multiSelectionDisplayDirection: [this.multiSelectionDisplayDirection],
        placeholder: [this.placeholder],
        ...getSdFnCheckData("getChildrenFn", this.getChildrenFn)
      }, () => {
        if (!this.itemControls) {
          this.contentElRef.nativeElement.innerHTML = `<span class='sd-text-color-grey-default'>${this.placeholder}</span>`;
          return;
        }

        const selectedItemControls = this.itemControls.filter((itemControl) => this.getIsSelectedItemControl(itemControl));
        const selectedItemEls = selectedItemControls.map((item) => item.elRef.nativeElement);
        const innerHTML = selectedItemEls
          .map((el) => {
            if (this.getChildrenFn?.[0]) {
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
          .join(this.multiSelectionDisplayDirection === "vertical" ? "<div class='p-sm-0'></div>" : ", ");

        if (innerHTML === "" && this.placeholder !== undefined) {
          this.contentElRef.nativeElement.innerHTML = `<span class='sd-text-color-grey-default'>${this.placeholder}</span>`;
        }
        else {
          this.contentElRef.nativeElement.innerHTML = innerHTML;
        }
      });
    });
  }

  onPopupKeydownOutside(event: KeyboardEvent) {
    if (
      !event.ctrlKey && !event.altKey && (
        event.key === "ArrowDown"
        || event.key === "ArrowUp"
      )
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (this.dropdownPopupElRef && document.activeElement instanceof HTMLElement) {
        const focusableEls = this.dropdownPopupElRef.nativeElement.findFocusableAll();
        const currIndex = focusableEls.indexOf(document.activeElement);

        if (event.key === "ArrowUp") {
          if (currIndex === 0) {
            if (this.dropdownControl?.contentElRef?.nativeElement) {
              this.dropdownControl.contentElRef.nativeElement.focus();
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
  }

  getIsSelectedItemControl(itemControl: SdSelectItemControl<T>): boolean {
    if (this.selectMode === "multi") {
      const itemKeyValues = this.keyProp != null && this.value instanceof Array ? this.value.map((item) => item[this.keyProp!]) : (this.value as T[]);
      const valKeyValue = this.keyProp != null && itemControl.value != null ? itemControl.value[this.keyProp] : itemControl.value;
      return itemKeyValues?.includes(valKeyValue) ?? false;
    }
    else {
      const itemKeyValue = this.keyProp != null && this.value != null ? this.value[this.keyProp] : this.value;
      const valKeyValue = this.keyProp != null && itemControl.value != null ? itemControl.value[this.keyProp] : itemControl.value;
      return itemKeyValue === valKeyValue;
    }
  }

  onItemControlClick(itemControl: SdSelectItemControl<T>, close: boolean) {
    if (this.selectMode === "multi") {
      const currValue = [...(this.value as T[] | undefined) ?? []];
      if (currValue.includes(itemControl.value)) {
        currValue.remove(itemControl.value);
      }
      else {
        currValue.push(itemControl.value);
      }

      if (this.valueChange.observed) {
        this.valueChange.emit(itemControl.value);
      }
      else {
        this.value = itemControl.value;
      }
    }
    else {
      if (this.value !== itemControl.value) {
        if (this.valueChange.observed) {
          this.valueChange.emit(itemControl.value);
        }
        else {
          this.value = itemControl.value;
        }
      }
    }

    if (this.dropdownControl && close) {
      this.dropdownControl.open = false;
    }
  }

  onSelectAllButtonClick(check: boolean) {
    if (!this.itemControls) return;

    const value = check ? this.itemControls.map((item) => item.value) : [];

    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
  }

  protected readonly rowOfListType!: {
    items: T[];
    depth: number;
  };

  protected readonly faCaretDown = faCaretDown;
}
