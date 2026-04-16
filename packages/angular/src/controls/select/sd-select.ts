import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import type { SafeHtml } from "@angular/platform-browser";
import { DomSanitizer } from "@angular/platform-browser";
import { SdDropdown } from "../dropdown/sd-dropdown";
import { SdDropdownPopup } from "../dropdown/sd-dropdown-popup";
import { SdSelectItem } from "./sd-select-item";
import { SdAnchor } from "../button/sd-anchor";
import { SdGap } from "../gap/sd-gap";
import { SdItemOfTemplate } from "../../core/template/sd-item-of-template";
import { SdRipple } from "../../core/ripple/sd-ripple";
import { setupInvalid } from "../../core/validation/setupInvalid";
import { NgIcon } from "@ng-icons/core";
import { tablerCaretDown } from "@ng-icons/tabler-icons";
import { tabbable } from "tabbable";

export type SelectModeValue<T> = {
  multi: T[];
  single: T;
};

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdown,
    SdDropdownPopup,
    SdAnchor,
    SdGap,
    NgTemplateOutlet,
    SdRipple,
    NgIcon,
  ],
  template: `
    <sd-dropdown [disabled]="disabled()" [(open)]="dropdownOpen">
      <div class="_sd-select-control" [sdRipple]="!disabled()">
        <div class="_sd-select-control-content" #contentEl>
          @if (_selectedItemContentHTML() != null) {
            <div [innerHTML]="_selectedItemContentHTML()"></div>
          } @else if (placeholder()) {
            <span class="sd-text-color-gray-default">{{ placeholder() }}</span>
          } @else {
            <span>&nbsp;</span>
          }
        </div>
        @if (!disabled()) {
          <div class="_sd-select-control-icon">
            <ng-icon [svg]="tablerCaretDown" />
          </div>
        }
      </div>
      @if (!disabled()) {
        <ng-content select="sd-select-button" />
      }
      <sd-dropdown-popup>
        @if (_headerTpl()) {
          <ng-template [ngTemplateOutlet]="_headerTpl()!" />
        }
        @if (selectMode() === "multi" && !hideSelectAll()) {
          <div class="_sd-select-all-bar">
            <sd-anchor data-sd-select-all (click)="onSelectAll()">전체선택</sd-anchor>
            <sd-gap [width]="'sm'" />
            <sd-anchor data-sd-deselect-all (click)="onDeselectAll()">전체해제</sd-anchor>
          </div>
        }
        @if (_beforeTpl()) {
          <ng-template [ngTemplateOutlet]="_beforeTpl()!" />
        }
        @if (_itemOfTpl(); as tpl) {
          @for (item of _flatItems(); track trackByFn()(item.data, item.index)) {
            <ng-template
              [ngTemplateOutlet]="tpl"
              [ngTemplateOutletContext]="{ $implicit: item.data, item: item.data, index: item.index, depth: item.depth }"
            />
          }
        } @else {
          <ng-content />
        }
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
  styles: [
    /* language=SCSS */ `
      sd-select {
        display: block;
        position: relative;
        width: 100%;
        min-width: 10em;

        > sd-dropdown {
          display: flex;
          overflow: hidden;

          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);

          &:focus,
          &:focus-within {
            border-color: var(--theme-primary-default);
          }

          > ._sd-select-control {
            display: flex;
            position: relative;
            gap: var(--gap-default);
            flex-grow: 1;
            padding: var(--gap-sm) var(--gap-default);
            cursor: pointer;

            > ._sd-select-control-content {
              flex: 1;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }

            > ._sd-select-control-icon {
              opacity: 0.3;
            }

            &:hover > ._sd-select-control-icon,
            &:focus > ._sd-select-control-icon,
            &:active > ._sd-select-control-icon {
              opacity: 1;
            }
          }

          > sd-select-button {
            padding: var(--gap-sm);
            border-left: 1px solid var(--theme-gray-lightest);

            &:last-of-type {
              border-top-right-radius: var(--border-radius-default);
              border-bottom-right-radius: var(--border-radius-default);
            }
          }
        }

        &[data-sd-disabled="true"] {
          > sd-dropdown {
            background: var(--theme-gray-lightest);

            > ._sd-select-control {
              color: var(--text-trans-light);
              cursor: default;

              > ._sd-select-control-icon {
                display: none;
              }
            }
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[data-sd-size="sm"] {
          > sd-dropdown {
            > ._sd-select-control {
              padding: var(--gap-xs) var(--gap-sm);
              gap: var(--gap-sm);
            }

            > sd-select-button {
              padding: var(--gap-xs);
            }
          }
        }

        &[data-sd-size="lg"] {
          > sd-dropdown {
            > ._sd-select-control {
              padding: var(--gap-default) var(--gap-lg);
              gap: var(--gap-lg);
            }

            > sd-select-button {
              padding: var(--gap-default);
            }
          }
        }

        &[data-sd-inset="true"] {
          min-width: auto;
          border-radius: 0;

          > sd-dropdown {
            border: none;
            border-radius: 0;

            > sd-select-button {
              border-radius: 0;
            }

            &:focus,
            &:focus-within {
              outline: 1px solid var(--theme-primary-default);
              outline-offset: -1px;

              > sd-select-button {
                outline: 1px solid var(--theme-primary-default);
                outline-offset: -1px;
              }
            }
          }

          &[data-sd-disabled="true"] > sd-dropdown {
            background: var(--control-color);

            > ._sd-select-control {
              color: var(--text-trans-default);
            }
          }
        }
      }

      ._sd-select-all-bar {
        display: flex;
        padding: var(--gap-sm) var(--gap-default);
        border-bottom: 1px solid var(--border-color-light);
      }
    `,
  ],
  host: {
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-disabled]": "disabled()",
  },
})
export class SdSelect<M extends "single" | "multi", T> {
  selectMode = input("single" as M);
  value = model<SelectModeValue<any>[M]>();
  placeholder = input<string>();
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  required = input(false, { transform: booleanAttribute });

  hideSelectAll = input(false, { transform: booleanAttribute });
  multiSelectionDisplayDirection = input<"vertical">();

  items = input<T[]>();
  trackByFn = input<(item: T, index: number) => unknown>((item) => item);
  getChildrenFn = input<(item: T) => T[] | undefined>();

  contentClass = input<string>();
  contentStyle = input<string>();

  dropdownOpen = model(false);

  protected readonly tablerCaretDown = tablerCaretDown;

  _itemControls = contentChildren(SdSelectItem);
  private readonly _dropdownControl = viewChild.required(SdDropdown);
  private readonly _dropdownElRef = viewChild.required<SdDropdown, ElementRef<HTMLElement>>(
    SdDropdown,
    { read: ElementRef },
  );

  _headerTpl = contentChild<TemplateRef<void>>("headerTpl");
  _beforeTpl = contentChild<TemplateRef<void>>("beforeTpl");
  _itemOfTpl = contentChild(SdItemOfTemplate, { read: TemplateRef });

  private readonly _sanitizer = inject(DomSanitizer);

  _selectedItemContentHTML = signal<SafeHtml | undefined>(undefined);

  _flatItems = computed(() => {
    const items = this.items();
    if (items == null) return [];
    const getChildren = this.getChildrenFn();
    const flat: { data: T; index: number; depth: number }[] = [];
    let index = 0;
    const walk = (list: T[], depth: number) => {
      for (const item of list) {
        flat.push({ data: item, index: index++, depth });
        if (getChildren != null) {
          const children = getChildren(item);
          if (children != null) {
            walk(children, depth + 1);
          }
        }
      }
    };
    walk(items, 0);
    return flat;
  });

  constructor() {
    // Required validation
    setupInvalid(() => {
      if (!this.required()) return "";
      const v = this.value();
      if (v == null) return "선택된 항목이 없습니다.";
      if (Array.isArray(v) && v.length === 0) return "선택된 항목이 없습니다.";
      return "";
    });

    // D3: contentClass/contentStyle via effect() on popup element
    // + D4: keyboard navigation via tabbable()
    effect((onCleanup) => {
      if (this.dropdownOpen()) {
        const popupEl = this._dropdownControl().popupElRef().nativeElement;
        const cls = this.contentClass();
        const addedClasses: string[] = [];
        if (cls != null) {
          for (const c of cls.split(" ").filter(Boolean)) {
            popupEl.classList.add(c);
            addedClasses.push(c);
          }
        }
        const style = this.contentStyle();
        const addedStyleProps: string[] = [];
        if (style != null) {
          const tempEl = document.createElement("div");
          tempEl.style.cssText = style;
          for (let i = 0; i < tempEl.style.length; i++) {
            const prop = tempEl.style[i];
            addedStyleProps.push(prop);
            popupEl.style.setProperty(prop, tempEl.style.getPropertyValue(prop));
          }
        }

        const onKeydown = (event: KeyboardEvent) => {
          if (event.ctrlKey || event.altKey) return;

          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();

            const tabbableEls = tabbable(popupEl);
            if (tabbableEls.length === 0) return;

            const currIndex = tabbableEls.indexOf(document.activeElement as HTMLElement);

            if (event.key === "ArrowDown") {
              const nextIndex = currIndex + 1;
              if (nextIndex < tabbableEls.length) {
                tabbableEls[nextIndex].focus();
              }
            } else {
              // ArrowUp
              if (currIndex <= 0) {
                // Return focus to dropdown trigger
                this._dropdownElRef().nativeElement.focus();
              } else {
                tabbableEls[currIndex - 1].focus();
              }
            }
          }
        };

        popupEl.addEventListener("keydown", onKeydown);
        onCleanup(() => {
          popupEl.removeEventListener("keydown", onKeydown);
          for (const c of addedClasses) {
            popupEl.classList.remove(c);
          }
          for (const prop of addedStyleProps) {
            popupEl.style.removeProperty(prop);
          }
        });
      }
    });

    // Mirror selected item's contentHTML to the trigger display area
    // PERF-004: item.value() reads are untracked to reduce signal subscriptions from O(N) to O(K).
    // _itemControls() already tracks item additions/removals, value() tracks selection changes.
    effect(() => {
      const items = this._itemControls();
      const currentValue = this.value();

      if (this.selectMode() === "multi") {
        const arr = currentValue as T[] | undefined;
        if (arr == null || arr.length === 0) {
          this._selectedItemContentHTML.set(undefined);
          return;
        }

        const selectedItems = untracked(() => items.filter((item) => arr.includes(item.value())));

        const isVertical = this.multiSelectionDisplayDirection() === "vertical";
        const separator = isVertical ? "<div class='p-sm-0'></div>" : ", ";
        const htmlParts: string[] = [];
        for (const item of selectedItems) {
          const html = item.contentHTML();
          if (html !== "") {
            htmlParts.push(`<span style="display: inline">${html}</span>`);
          }
        }
        if (htmlParts.length > 0) {
          this._selectedItemContentHTML.set(
            this._sanitizer.bypassSecurityTrustHtml(htmlParts.join(separator)),
          );
        } else {
          this._selectedItemContentHTML.set(undefined);
        }
        return;
      }

      const selectedItem = untracked(() => items.find((item) => item.value() === currentValue));
      if (selectedItem != null) {
        const html = selectedItem.contentHTML();
        if (html !== "") {
          this._selectedItemContentHTML.set(this._sanitizer.bypassSecurityTrustHtml(html));
        } else {
          this._selectedItemContentHTML.set(undefined);
        }
      } else {
        this._selectedItemContentHTML.set(undefined);
      }
    });
  }

  selectItem(itemValue: T | undefined): void {
    this._setOrToggle(itemValue);
    if (this.selectMode() === "single") {
      this.closeDropdown();
    }
  }

  toggleItem(itemValue: T | undefined): void {
    this._setOrToggle(itemValue);
  }

  private _setOrToggle(itemValue: T | undefined): void {
    if (this.selectMode() === "single") {
      this.value.set(itemValue);
    } else {
      this.value.update((v) => {
        const arr = (v as T[] | undefined) ?? [];
        if (arr.includes(itemValue as T)) {
          return arr.filter((item) => item !== itemValue);
        } else {
          return [...arr, itemValue];
        }
      });
    }
  }

  onSelectAll(): void {
    const items = this._itemControls();
    const values = items
      .filter((item) => !item.disabled() && !item.hidden())
      .map((item) => item.value());
    this.value.set(values);
  }

  onDeselectAll(): void {
    this.value.set([]);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  openDropdown(): void {
    if (this.disabled()) return;
    this.dropdownOpen.set(true);
  }
}
