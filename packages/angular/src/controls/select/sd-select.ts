import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  effect,
  ElementRef,
  input,
  model,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
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
          @if (_selectedItemContentHTML() !== undefined) {
            <div [innerHTML]="_selectedItemContentHTML()"></div>
          } @else if (placeholder()) {
            <span class="tx-trans-lighter">{{ placeholder() }}</span>
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
          @for (item of _flatItems(); track item) {
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
      @use "../../../scss/commons/mixins";

      sd-select {
        display: block;
        position: relative;

        > sd-dropdown {
          > ._sd-select-control {
            @include mixins.form-control-base();
            display: flex;
            align-items: center;
            cursor: pointer;

            border: 1px solid var(--trans-lighter);
            border-radius: var(--border-radius-default);
            background: var(--theme-secondary-lightest);

            > ._sd-select-control-content {
              flex: 1;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }

            > ._sd-select-control-icon {
              margin-left: var(--gap-sm);
              opacity: 0.3;
            }
          }

          &:focus-within > ._sd-select-control {
            border-color: var(--theme-secondary-default);
          }
        }

        &[data-sd-size="sm"] > sd-dropdown > ._sd-select-control {
          padding: var(--gap-xs) var(--gap-sm);
        }

        &[data-sd-size="lg"] > sd-dropdown > ._sd-select-control {
          padding: var(--gap-default) var(--gap-lg);
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          width: auto;
        }

        &[data-sd-inset="true"] > sd-dropdown > ._sd-select-control {
          border: none;
          border-radius: 0;

          &:focus-within {
            outline: 1px solid var(--theme-primary-default);
          }
        }

        &[data-sd-disabled="true"] {
          > sd-dropdown > ._sd-select-control {
            background: var(--trans-lighter);
            cursor: default;

            > ._sd-select-control-icon {
              display: none;
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
  getChildrenFn = input<(item: T) => T[] | undefined>();

  contentClass = input<string>();
  contentStyle = input<string>();

  dropdownOpen = signal(false);

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

  _selectedItemContentHTML = signal<string | undefined>(undefined);

  _flatItems = computed(() => {
    const items = this.items();
    if (items == null) return [];
    const getChildren = this.getChildrenFn();
    const flat: { data: T; index: number; depth: number }[] = [];
    let index = 0;
    const walk = (list: T[], depth: number) => {
      for (const item of list) {
        flat.push({ data: item, index: index++, depth });
        if (getChildren !== undefined) {
          const children = getChildren(item);
          if (children !== undefined) {
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
        if (cls !== undefined) {
          for (const c of cls.split(" ").filter(Boolean)) {
            popupEl.classList.add(c);
            addedClasses.push(c);
          }
        }
        const style = this.contentStyle();
        const addedStyleProps: string[] = [];
        if (style !== undefined) {
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

            const focusableEls = tabbable(popupEl);
            if (focusableEls.length === 0) return;

            const currIndex = focusableEls.indexOf(document.activeElement as HTMLElement);

            if (event.key === "ArrowDown") {
              const nextIndex = currIndex + 1;
              if (nextIndex < focusableEls.length) {
                focusableEls[nextIndex].focus();
              }
            } else {
              // ArrowUp
              if (currIndex <= 0) {
                // Return focus to dropdown trigger
                this._dropdownElRef().nativeElement.focus();
              } else {
                focusableEls[currIndex - 1].focus();
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

      if (currentValue == null) {
        this._selectedItemContentHTML.set(undefined);
        return;
      }

      if (this.selectMode() === "multi") {
        const arr = currentValue as T[];
        if (arr.length === 0) {
          this._selectedItemContentHTML.set(undefined);
          return;
        }

        const selectedItems = untracked(() => items.filter((item) => arr.includes(item.value())));

        const separator = this.multiSelectionDisplayDirection() === "vertical" ? "<br>" : ", ";
        const htmlParts: string[] = [];
        for (const item of selectedItems) {
          const html = item.contentHTML();
          if (html !== "") {
            htmlParts.push(html);
          }
        }
        if (htmlParts.length > 0) {
          this._selectedItemContentHTML.set(htmlParts.join(separator));
        } else {
          this._selectedItemContentHTML.set(undefined);
        }
        return;
      }

      const selectedItem = untracked(() => items.find((item) => item.value() === currentValue));
      if (selectedItem != null) {
        const html = selectedItem.contentHTML();
        if (html !== "") {
          this._selectedItemContentHTML.set(html);
        } else {
          this._selectedItemContentHTML.set(undefined);
        }
      } else {
        this._selectedItemContentHTML.set(undefined);
      }
    });
  }

  selectItem(itemValue: T): void {
    this._setOrToggle(itemValue);
    if (this.selectMode() === "single") {
      this.closeDropdown();
    }
  }

  toggleItem(itemValue: T): void {
    this._setOrToggle(itemValue);
  }

  private _setOrToggle(itemValue: T): void {
    if (this.selectMode() === "single") {
      this.value.set(itemValue);
    } else {
      this.value.update((v) => {
        const arr = (v as T[] | undefined) ?? [];
        if (arr.includes(itemValue)) {
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
