import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { SdDropdownControl } from "./SdDropdownControl";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../directives/SdItemOfTemplateDirective";
import { coercionBoolean } from "../utils/commons";
import { SdIconControl } from "./SdIconControl";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockControl } from "./SdDockControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdGapControl } from "./SdGapControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdTypedTemplateDirective } from "../directives/SdTypedTemplateDirective";
import { SdDropdownPopupControl } from "./SdDropdownPopupControl";
import { StringUtil } from "@simplysm/sd-core-common";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";
import { SdButtonControl } from "./SdButtonControl";
import { sdCheck, sdGetter, TSdGetter } from "../utils/hooks";

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
    SdButtonControl,
  ],
  template: `
    <sd-dropdown
      #dropdown
      [disabled]="disabled"
      [contentClass]="contentClass"
      [contentStyle]="contentStyle"
      [open]="open"
      (openChange)="openChange.emit($event)"
    >
      <div class="_sd-select-control">
        <div #contentEl class="_sd-select-control-content"></div>
        <div class="_sd-select-control-icon">
          <sd-icon [icon]="icons.caretDown" />
        </div>

        <div class="_invalid-indicator"></div>
      </div>

      @if (!disabled) {
        <ng-content select="sd-select-button" />
      }

      <sd-dropdown-popup #dropdownPopup (keydown.outside)="onPopupKeydownOutside($event)">
        @if (!items) {
          <sd-dock-container>
            @if (headerTemplateRef) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="headerTemplateRef" />
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
                <ng-template [ngTemplateOutlet]="headerTemplateRef" />
              </sd-dock>
            }

            @if (selectMode === "multi" && !hideSelectAll) {
              <sd-dock class="bdb bdb-trans-default p-sm-default">
                <sd-anchor (click)="onSelectAllButtonClick(true)"> 전체선택</sd-anchor>
                <sd-gap width="sm"></sd-gap>
                <sd-anchor (click)="onSelectAllButtonClick(false)"> 전체해제</sd-anchor>
              </sd-dock>
            }

            <sd-pane>
              <ng-template [ngTemplateOutlet]="beforeTemplateRef ?? null" />
              <ng-template #rowOfList [typed]="rowOfListType" let-items="items" let-depth="depth">
                @for (item of items; let index = $index; track trackByGetter(item, index)) {
                  <div class="_sd-select-item">
                    <ng-template
                      [ngTemplateOutlet]="itemTemplateRef ?? null"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: index,
                        depth: depth,
                      }"
                    ></ng-template>

                    @if (
                      getChildrenGetter &&
                      getChildrenGetter(item, index, depth) &&
                      getChildrenGetter(item, index, depth).length > 0
                    ) {
                      <div class="_children">
                        <ng-template
                          [ngTemplateOutlet]="rowOfList"
                          [ngTemplateOutletContext]="{
                            items: getChildrenGetter(item, index, depth),
                            depth: depth + 1,
                          }"
                        ></ng-template>
                      </div>
                    }
                  </div>
                }
              </ng-template>
              <ng-template
                [ngTemplateOutlet]="rowOfList"
                [ngTemplateOutletContext]="{ items: items, depth: 0 }"
              ></ng-template>
            </sd-pane>
          </sd-dock-container>
        }
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
  styles: [
    /* language=SCSS */ `
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
                opacity: 0.3;
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

            > sd-select-button {
              padding: var(--gap-sm);
              border-left: 1px solid var(--theme-grey-lightest);

              &:last-of-type {
                border-top-right-radius: var(--border-radius-default);
                border-bottom-right-radius: var(--border-radius-default);
              }
            }
          }
        }

        &[sd-disabled="true"] {
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

        &:has(:invalid),
        &[sd-invalid] {
          > sd-dropdown > ._sd-dropdown-control > ._sd-select-control > ._invalid-indicator {
            display: block;
          }
        }

        &[sd-inline="true"] {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[sd-size="sm"] {
          > sd-dropdown > ._sd-dropdown-control {
            > ._sd-select-control {
              padding: var(--gap-xs) var(--gap-sm);
              gap: var(--gap-sm);
            }

            > sd-select-button {
              padding: var(--gap-xs);
            }
          }
        }

        &[sd-size="lg"] {
          > sd-dropdown > ._sd-dropdown-control {
            > ._sd-select-control {
              padding: var(--gap-default) var(--gap-lg);
              gap: var(--gap-lg);
            }

            > sd-select-button {
              padding: var(--gap-default);
            }
          }
        }

        &[sd-inset="true"] {
          min-width: auto;
          border-radius: 0;

          > sd-dropdown > ._sd-dropdown-control {
            border: none;
            border-radius: 0;

            > sd-select-button {
              border-radius: 0;
            }

            &:focus,
            &:has(:focus) {
              outline: 1px solid var(--theme-primary-default);
              outline-offset: -1px;

              > sd-select-button {
                outline: 1px solid var(--theme-primary-default);
                outline-offset: -1px;
              }
            }
          }

          &[sd-disabled="true"] > sd-dropdown > ._sd-dropdown-control {
            background: white;

            > ._sd-select-control {
              color: var(--text-trans-default);
            }
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-disabled]": "disabled",
    "[attr.sd-inline]": "inline",
    "[attr.sd-inset]": "inset",
    "[attr.sd-size]": "size",
    "[attr.sd-invalid]": "getErrorMessage()",
  },
})
export class SdSelectControl<M extends "single" | "multi", T> {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input() value?: M extends "multi" ? any[] : any;
  @Output() valueChange = new EventEmitter<M extends "multi" ? any[] : any>();

  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input({ transform: coercionBoolean }) required = false;
  @Input({ transform: coercionBoolean }) disabled = false;

  @Input() items?: T[];
  @Input() trackByGetter: TSdGetter<(item: T, index: number) => any> = sdGetter((item) => item);
  @Input() getChildrenGetter?: TSdGetter<(item: T, index: number, depth: number) => T[]>;

  @Input({ transform: coercionBoolean }) inline = false;
  @Input({ transform: coercionBoolean }) inset = false;
  @Input() size?: "sm" | "lg";
  @Input() selectMode: M = "single" as M;
  @Input() contentClass?: string;
  @Input() contentStyle?: string;
  @Input() multiSelectionDisplayDirection?: "vertical" | "horizontal";
  @Input({ transform: coercionBoolean }) hideSelectAll = false;
  @Input() placeholder?: string;

  @ViewChild("contentEl", { static: true }) contentElRef!: ElementRef<HTMLElement>;
  @ViewChild("dropdown", { static: true }) dropdownControl!: SdDropdownControl;
  @ViewChild("dropdownPopup", { static: true, read: ElementRef }) dropdownPopupElRef!: ElementRef<HTMLElement>;

  @ContentChild("header", { static: true }) headerTemplateRef?: TemplateRef<void>;
  @ContentChild("before", { static: true }) beforeTemplateRef?: TemplateRef<void>;
  @ContentChild(SdItemOfTemplateDirective, { static: true, read: TemplateRef })
  itemTemplateRef?: TemplateRef<SdItemOfTemplateContext<T>>;

  itemControls: SdSelectItemControl[] = [];

  getErrorMessage = sdGetter(
    () => ({
      required: [this.required],
      value: [this.value],
    }),
    () => {
      const errorMessages: string[] = [];

      if (this.required && this.value === undefined) {
        errorMessages.push("선택된 항목이 없습니다.");
      }

      const fullErrorMessage = errorMessages.join("\r\n");
      return !StringUtil.isNullOrEmpty(fullErrorMessage) ? fullErrorMessage : undefined;
    },
  );

  constructor() {
    sdCheck.outside(
      () => ({
        itemControls: [this.itemControls, "one"],
        selectMode: [this.selectMode],
        value: [this.value],
        multiSelectionDisplayDirection: [this.multiSelectionDisplayDirection],
        placeholder: [this.placeholder],
        innerHTML: [
          this.itemControls
            .filter((item) => item.isSelected)
            .map((item) => item.elRef.nativeElement.findFirst("> ._content")?.innerHTML),
          "one",
        ],
      }),
      () => {
        const selectedItemControls = this.itemControls.filter((itemControl) => itemControl.isSelected);
        const selectedItemEls = selectedItemControls.map((item) => item.elRef.nativeElement);
        const innerHTML = selectedItemEls
          .map((el) => el.findFirst("> ._content")?.innerHTML ?? "")
          .map((item) => `<div style="display: inline-block">${item}</div>`)
          .join(this.multiSelectionDisplayDirection === "vertical" ? "<div class='p-sm-0'></div>" : ", ");

        if (innerHTML === "" && this.placeholder !== undefined) {
          this.contentElRef.nativeElement.innerHTML = `<span class='sd-text-color-grey-default'>${this.placeholder}</span>`;
        } else {
          this.contentElRef.nativeElement.innerHTML = innerHTML;
        }
      },
    );
  }

  onPopupKeydownOutside(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      event.stopPropagation();

      if (document.activeElement instanceof HTMLElement) {
        const focusableEls = this.dropdownPopupElRef.nativeElement.findFocusableAll();
        const currIndex = focusableEls.indexOf(document.activeElement);

        if (event.key === "ArrowUp") {
          if (currIndex === 0) {
            this.dropdownControl.contentElRef.nativeElement.focus();
          } else {
            focusableEls[currIndex - 1].focus();
          }
        } else {
          if (typeof focusableEls[currIndex + 1] !== "undefined") {
            focusableEls[currIndex + 1].focus();
          }
        }
      }
    }
  }

  getIsSelectedItemControl(itemControl: SdSelectItemControl): boolean {
    if (this.selectMode === "multi") {
      const itemKeyValues = this.value as any[] | undefined;
      return itemKeyValues?.includes(itemControl.value) ?? false;
    } else {
      const itemKeyValue = this.value;
      return itemKeyValue === itemControl.value;
    }
  }

  onItemControlClick(itemControl: SdSelectItemControl, close: boolean) {
    if (this.selectMode === "multi") {
      const currValue = [...((this.value ?? []) as any[])];
      if (currValue.includes(itemControl.value)) {
        currValue.remove(itemControl.value);
      } else {
        currValue.push(itemControl.value);
      }

      this.valueChange.emit(currValue);
    } else {
      if (this.value !== itemControl.value) {
        this.value = itemControl.value;
        this.valueChange.emit(itemControl.value);
      }
    }

    if (close) {
      this.dropdownControl.open = false;
      this.dropdownControl.openChange.emit(false);
    }
  }

  onSelectAllButtonClick(check: boolean) {
    const value = check ? this.itemControls.map((item) => item.value) : [];

    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(value);
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
