import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output,
  TemplateRef,
  ViewChild, ViewEncapsulation
} from "@angular/core";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdItemOfTemplateContext, SdItemOfTemplateDirective} from "../directives/SdItemOfTemplateDirective";
import {coercionBoolean, getSdFnCheckData, TSdFnInfo} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {SdIconControl} from "./SdIconControl";
import {SdEventsDirective} from "../directives/SdEventsDirective";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {NgTemplateOutlet} from "@angular/common";
import {SdDockControl} from "./SdDockControl";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdGapControl} from "./SdGapControl";
import {SdPaneControl} from "./SdPaneControl";
import {SdTypedTemplateDirective} from "../directives/SdTypedTemplateDirective";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {StringUtil} from "@simplysm/sd-core-common";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {SdButtonControl} from "./SdButtonControl";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdIconControl,
    SdEventsDirective,
    SdDockContainerControl,
    SdDockControl,
    SdAnchorControl,
    SdGapControl,
    SdPaneControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdButtonControl
  ],
  template: `
    <sd-dropdown #dropdown [disabled]="disabled"
                 [contentClass]="contentClass"
                 [contentStyle]="contentStyle">
      <div class="_sd-select-control">
        <div #contentEl class="_sd-select-control-content"></div>
        <div class="_sd-select-control-icon">
          <sd-icon [icon]="icons.caretDown"/>
        </div>

        <div class="_invalid-indicator"></div>
      </div>

      @if (buttonIcon && !disabled) {
        <sd-button class="_sd-select-button" inset [size]="size"
                   (click)="onButtonClick($event)">
          <sd-icon [icon]="buttonIcon"/>
        </sd-button>
      }

      <sd-dropdown-popup #dropdownPopup (keydown.outside)="onPopupKeydownOutside($event)">
        @if (!items) {
          <sd-dock-container>
            <!--<sd-dock class="bdb bdb-trans-default p-sm-default"
                     *ngIf="selectMode === 'multi' && !hideSelectAll">
              <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
              <sd-gap width="sm"></sd-gap>
              <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
            </sd-dock>-->

            @if (headerTemplateRef) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="headerTemplateRef"/>
              </sd-dock>
            }

            <sd-pane>
              <ng-content></ng-content>
            </sd-pane>
          </sd-dock-container>
        } @else {
          <sd-dock-container>
            @if (headerTemplateRef) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="headerTemplateRef"/>
              </sd-dock>
            }

            @if (selectMode === 'multi' && !hideSelectAll) {
              <sd-dock class="bdb bdb-trans-default p-sm-default">
                <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
                <sd-gap width="sm"></sd-gap>
                <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
              </sd-dock>
            }

            <sd-pane>
              <ng-template [ngTemplateOutlet]="beforeTemplateRef ?? null"/>
              <ng-template #rowOfList [typed]="rowOfListType" let-items="items" let-depth="depth">
                @for (item of items; let index = $index; track trackByFn[0](index, item)) {
                  <div class="_sd-select-item">
                    <ng-template [ngTemplateOutlet]="itemTemplateRef ?? null"
                                 [ngTemplateOutletContext]="{$implicit: item, item: item, index: index, depth: depth}"></ng-template>

                    @if (getChildrenFn?.[0] && getChildrenFn![0](index, item, depth) && getChildrenFn![0](index, item, depth).length > 0) {
                      <div class="_children">
                        <ng-template [ngTemplateOutlet]="rowOfList"
                                     [ngTemplateOutletContext]="{items: getChildrenFn![0](index, item, depth), depth: depth + 1}"></ng-template>
                      </div>
                    }
                  </div>
                }
              </ng-template>
              <ng-template [ngTemplateOutlet]="rowOfList"
                           [ngTemplateOutletContext]="{items: items, depth: 0}"></ng-template>
            </sd-pane>
          </sd-dock-container>
        }
      </sd-dropdown-popup>
    </sd-dropdown>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-select {
      display: block;
      width: 100%;
      min-width: 10em;

       > sd-dropdown {
        > ._sd-dropdown-control {
          display: flex;
          overflow: hidden;

          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);

          &:focus,
          &:has(:focus) {
            border-color: var(--theme-primary-default);
          }

          > ._sd-select-control {
            display: flex;
            position: relative;
            gap: var(--gap-default);
            flex-grow: 1;
            padding: var(--gap-sm) var(--gap-default);

            cursor: pointer;
            @include active-effect(true);

            > ._sd-select-control-content {
              flex-grow: 1;
              white-space: nowrap;
            }

            > ._sd-select-control-icon {
              opacity: .3;
            }

            &:hover > ._sd-select-control-icon,
            &:focus > ._sd-select-control-icon,
            &:active > ._sd-select-control-icon {
              opacity: 1;
            }

            > ._invalid-indicator {
              display: none;
              //display: block;
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

          > ._sd-select-button > button {
            padding: var(--gap-sm);
            border-top-right-radius: var(--border-radius-default);
            border-bottom-right-radius: var(--border-radius-default);
          }
        }
      }


      &[sd-disabled=true] {
         > sd-dropdown > ._sd-dropdown-control {
          background: var(--theme-grey-lightest);

          > ._sd-select-control {
            color: var(--text-trans-light);
            cursor: default;

            @include active-effect(false);

            > ._sd-select-control-icon {
              display: none;
            }
          }
        }
      }

      &:has(:invalid), &[sd-invalid] {
         > sd-dropdown > ._sd-dropdown-control > ._sd-select-control > ._invalid-indicator {
          display: block;
        }
      }

      &[sd-inline=true] {
        display: inline-block;
        width: auto;
        vertical-align: top;
      }

      &[sd-size=sm] {
         > sd-dropdown > ._sd-dropdown-control {
          > ._sd-select-control {
            padding: var(--gap-xs) var(--gap-sm);
            gap: var(--gap-sm);
          }

          > ._sd-select-button > button {
            padding: var(--gap-xs);
          }
        }
      }

      &[sd-size=lg] {
         > sd-dropdown > ._sd-dropdown-control {
          > ._sd-select-control {
            padding: var(--gap-default) var(--gap-lg);
            gap: var(--gap-lg);
          }

          > ._sd-select-button > button {
            padding: var(--gap-default);
          }
        }
      }

      &[sd-inset=true] {
        min-width: auto;
        border-radius: 0;

        >  sd-dropdown > ._sd-dropdown-control {
          border: none;
          border-radius: 0;

          > ._sd-select-button > button {
            border-radius: 0;
          }

          &:focus,
          &:has(:focus) {
            outline: 1px solid var(--theme-primary-default);
            outline-offset: -1px;

            > ._sd-select-button > button {
              outline: 1px solid var(--theme-primary-default);
              outline-offset: -1px;
            }
          }
        }

        &[sd-disabled=true]  > sd-dropdown > ._sd-dropdown-control {
          background: white;

          > ._sd-select-control {
            color: var(--text-trans-default);
          }
        }
      }
    }
  `],
  host: {
    "[attr.sd-disabled]": "disabled",
    "[attr.sd-inline]": "inline",
    "[attr.sd-inset]": "inset",
    "[attr.sd-size]": "size",
    "[attr.sd-invalid]": "errorMessage"
  }
})
export class SdSelectControl<M extends "single" | "multi", T extends any> implements DoCheck {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input() value?: M extends "multi" ? any[] : any;
  @Output() valueChange = new EventEmitter<M extends "multi" ? any[] : any>();

  @Input({transform: coercionBoolean}) required = false;
  @Input({transform: coercionBoolean}) disabled = false;
  @Input() keyProp?: string;

  @Input() items?: T[];
  @Input() trackByFn: TSdFnInfo<(index: number, item: T) => any> = [(index, item) => item];
  @Input({}) getChildrenFn?: TSdFnInfo<(index: number, item: T, depth: number) => T[]>;

  @Input({transform: coercionBoolean}) inline = false;
  @Input({transform: coercionBoolean}) inset = false;
  @Input() size?: "sm" | "lg";
  @Input() selectMode: M = "single" as M;
  @Input() contentClass?: string;
  @Input() contentStyle?: string;
  @Input() multiSelectionDisplayDirection?: "vertical" | "horizontal";
  @Input({transform: coercionBoolean}) hideSelectAll = false;
  @Input() placeholder?: string;

  @Input() buttonIcon?: IconProp;
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  @ViewChild("contentEl", {static: true}) contentElRef!: ElementRef<HTMLElement>;
  @ViewChild("dropdown", {static: true}) dropdownControl!: SdDropdownControl;
  @ViewChild("dropdownPopup", {static: true, read: ElementRef}) dropdownPopupElRef!: ElementRef<HTMLElement>;

  @ContentChild("header", {static: true}) headerTemplateRef?: TemplateRef<void>;
  @ContentChild("before", {static: true}) beforeTemplateRef?: TemplateRef<void>;
  @ContentChild(SdItemOfTemplateDirective, {static: true, read: TemplateRef})
  itemTemplateRef?: TemplateRef<SdItemOfTemplateContext<T>>;

  itemControls: SdSelectItemControl<any>[] = [];

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

      if (document.activeElement instanceof HTMLElement) {
        const focusableEls = this.dropdownPopupElRef.nativeElement.findFocusableAll();
        const currIndex = focusableEls.indexOf(document.activeElement);

        if (event.key === "ArrowUp") {
          if (currIndex === 0) {
            this.dropdownControl.contentElRef.nativeElement.focus();
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

    if (close) {
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

  onButtonClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.buttonClick.emit(event);
  }

  protected readonly rowOfListType!: {
    items: T[];
    depth: number;
  };
}
