import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  Injector,
  Input,
  Output,
  TemplateRef,
  ViewChild
} from "@angular/core";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdItemOfTemplateContext, SdItemOfTemplateDirective} from "../directives/SdItemOfTemplateDirective";
import {coercionBoolean, getSdFnCheckData, TSdFnInfo} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {SdIconControl} from "./SdIconControl";
import {SdEventsDirective} from "../directives/SdEventsDirective";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {NgForOf, NgIf, NgTemplateOutlet} from "@angular/common";
import {SdDockControl} from "./SdDockControl";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdGapControl} from "./SdGapControl";
import {SdPaneControl} from "./SdPaneControl";
import {SdTypedTemplateDirective} from "../directives/SdTypedTemplateDirective";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {StringUtil} from "@simplysm/sd-core-common";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdIconControl,
    SdEventsDirective,
    SdDockContainerControl,
    NgIf,
    SdDockControl,
    SdAnchorControl,
    SdGapControl,
    SdPaneControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    NgForOf,
  ],
  template: `
    <sd-dropdown #dropdown [disabled]="disabled"
                 [contentClass]="contentClass"
                 [contentStyle]="contentStyle">
      <div #contentEl></div>
      <div class="_invalid-indicator"></div>
      <div class="_icon">
        <sd-icon [icon]="icons.caretDown" fixedWidth/>
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
                                 [ngTemplateOutletContext]="{$implicit: item, item: item, index: index, depth: depth}"></ng-template>

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
    @import "../scss/mixins";

    :host {
      display: block;
      width: 100%;
      min-width: 10em;

      ::ng-deep > sd-dropdown > div {
        @include form-control-base();

        position: relative;
        display: block;
        overflow: visible;
        padding-right: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px) !important;
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;
        cursor: pointer;

        @include active-effect(true);

        body.sd-theme-compact &,
        body.sd-theme-modern & {
          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);
        }

        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          border: none;
          border-bottom: 2px solid var(--border-color-default);
          background: transparent;
          transition: border-color 0.3s;
          padding: calc(var(--gap-sm) + 1px) 0 calc(var(--gap-sm) - 1px);
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

        body.sd-theme-compact &,
        body.sd-theme-modern & {
          &:focus {
            outline-color: var(--theme-primary-default);
          }
        }

        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          &:focus {
            border-color: var(--theme-primary-default);
          }
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

      &:has(:invalid), &[sd-invalid] {
        ::ng-deep > sd-dropdown > div > ._invalid-indicator {
          display: block;
          position: absolute;
          z-index: 9999;
          background: var(--theme-danger-default);

          top: var(--gap-xs);
          left: var(--gap-xs);
          border-radius: 100%;
          width: var(--gap-sm);
          height: var(--gap-sm);
        }
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
        body.sd-theme-compact &,
        body.sd-theme-modern &,
        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
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
    }

    ._sd-select-item > ._children {
      border-left: var(--gap-xl) solid var(--theme-secondary-lightest);
    }
  `]
})
export class SdSelectControl<M extends "single" | "multi", T extends any> implements DoCheck {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input()
  value?: M extends "multi" ? any[] : any;

  @Output()
  valueChange = new EventEmitter<M extends "multi" ? any[] : any>();

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

  itemControls: SdSelectItemControl<any>[] = [];

  @Input()
  items?: T[];

  @Input()
  trackByFn: TSdFnInfo<(index: number, item: T) => any> = [(index, item) => item];

  @Input({})
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
  selectMode: M = "single" as M;

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

  @ViewChild("contentEl", {static: true})
  contentElRef!: ElementRef<HTMLElement>;

  @HostBinding("attr.sd-invalid")
  errorMessage?: string;

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

    this.#sdNgHelper.doCheck(run => {
      run({
        required: [this.required],
        value: [this.value]
      }, () => {
        const errorMessages: string[] = [];

        if (this.required && this.value === undefined) {
          errorMessages.push("선택된 항목이 없습니다.");
        }

        const fullErrorMessage = errorMessages.join("\r\n");
        this.errorMessage = !StringUtil.isNullOrEmpty(fullErrorMessage) ? fullErrorMessage : undefined;
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

  getIsSelectedItemControl(itemControl: SdSelectItemControl<any>): boolean {
    if (this.selectMode === "multi") {
      const itemKeyValues = this.keyProp != null ? this.value?.map((item: any) => item[this.keyProp!]) ?? [] : (this.value as T[]);
      const valKeyValue = this.keyProp != null && itemControl.value != null ? itemControl.value[this.keyProp] : itemControl.value;
      return itemKeyValues?.includes(valKeyValue) ?? false;
    }
    else {
      const itemKeyValue = this.keyProp != null && this.value != null ? this.value[this.keyProp] : this.value;
      const valKeyValue = this.keyProp != null && itemControl.value != null ? itemControl.value[this.keyProp] : itemControl.value;
      return itemKeyValue === valKeyValue;
    }
  }

  onItemControlClick(itemControl: SdSelectItemControl<any>, close: boolean) {
    if (this.selectMode === "multi") {
      const currValue = [...(this.value as T[] | undefined) ?? []];
      if (currValue.includes(itemControl.value)) {
        currValue.remove(itemControl.value);
      }
      else {
        currValue.push(itemControl.value);
      }

      if (this.valueChange.observed) {
        this.valueChange.emit(currValue);
      }
      else {
        this.value = currValue;
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
    const value = check ? this.itemControls.map((item) => item.value) : [];

    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }

    for (const itemControl of this.itemControls) {
      itemControl.markForCheck();
    }
  }

  protected readonly rowOfListType!: {
    items: T[];
    depth: number;
  };
}
