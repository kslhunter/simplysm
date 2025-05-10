import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  ElementRef,
  inject,
  input,
  output,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectItemControl } from "./sd-select-item.control";
import { SdDropdownControl } from "./sd-dropdown.control";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../directives/sd-item-of.template-directive";
import { SdDockContainerControl } from "./sd-dock-container.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockControl } from "./sd-dock.control";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdGapControl } from "./sd-gap.control";
import { SdPaneControl } from "./sd-pane.control";
import { SdTypedTemplateDirective } from "../directives/sd-typed.template-directive";
import { SdDropdownPopupControl } from "./sd-dropdown-popup.control";
import { StringUtils } from "@simplysm/sd-core-common";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $afterRenderEffect, $computed, $model, $signal } from "../utils/hooks/hooks";
import { transformBoolean } from "../utils/type-tramsforms";
import { SdRippleDirective } from "../directives/sd-ripple.directive";
import { SdIconControl } from "./sd-icon.control";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdDockContainerControl,
    SdDockControl,
    SdAnchorControl,
    SdGapControl,
    SdPaneControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdRippleDirective,
    SdIconControl,
  ],
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

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

              > ._sd-select-control-icon {
                display: none;
              }
            }
          }
        }

        &:has(:invalid),
        &[sd-invalid-message] {
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
            background: var(--control-color);

            > ._sd-select-control {
              color: var(--text-trans-default);
            }
          }
        }
      }
    `,
  ],
  template: `
    <sd-dropdown
      #dropdown
      [disabled]="disabled()"
      [contentClass]="contentClass()"
      [contentStyle]="contentStyle()"
      [(open)]="open"
    >
      <div class="_sd-select-control" [sd-ripple]="!disabled()">
        <div #contentEl class="_sd-select-control-content"></div>
        <div class="_sd-select-control-icon">
          <sd-icon [icon]="icons.caretDown" />
        </div>

        <div class="_invalid-indicator"></div>
      </div>

      @if (!disabled()) {
        <ng-content select="sd-select-button" />
      }

      <sd-dropdown-popup #dropdownPopup (keydown)="onPopupKeydown($event)">
        @if (!items()) {
          <sd-dock-container>
            @if (headerTemplateRef()) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="headerTemplateRef()!" />
              </sd-dock>
            }

            <sd-pane>
              <ng-content></ng-content>
            </sd-pane>
          </sd-dock-container>
        } @else {
          <sd-dock-container>
            @if (headerTemplateRef()) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="headerTemplateRef()!" />
              </sd-dock>
            }

            @if (selectMode() === "multi" && !hideSelectAll()) {
              <sd-dock class="p-sm-default">
                <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
                <sd-gap width="sm"></sd-gap>
                <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
              </sd-dock>
            }

            <sd-pane class="bdt bdt-trans-default">
              <ng-template [ngTemplateOutlet]="beforeTemplateRef() ?? null" />
              <ng-template #rowOfList [typed]="rowOfListType" let-items="items" let-depth="depth">
                @for (item of items; let index = $index; track trackByFn()(item, index)) {
                  <div class="_sd-select-item">
                    <ng-template
                      [ngTemplateOutlet]="itemTemplateRef() ?? null"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: index,
                        depth: depth,
                      }"
                    ></ng-template>

                    @if (getChildrenFn() &&
                    getChildrenFn()!(item, index, depth) &&
                    getChildrenFn()!(item, index, depth).length > 0) {
                      <div class="_children">
                        <ng-template
                          [ngTemplateOutlet]="rowOfList"
                          [ngTemplateOutletContext]="{
                            items: getChildrenFn()!(item, index, depth),
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
                [ngTemplateOutletContext]="{ items: items(), depth: 0 }"
              ></ng-template>
            </sd-pane>
          </sd-dock-container>
        }
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
  host: {
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-inset]": "inset()",
    "[attr.sd-size]": "size()",
    "[attr.sd-invalid-message]": "errorMessage()",
  },
})
export class SdSelectControl<M extends "single" | "multi", T> {
 protected readonly icons = inject(SdAngularConfigProvider).icons;

  __value = input<TSelectValue<any>[M] | undefined>(undefined, { alias: "value" });
  __valueChange = output<TSelectValue<any>[M] | undefined>({ alias: "valueChange" });
  value = $model(this.__value, this.__valueChange);

  __open = input(false, { alias: "open", transform: transformBoolean });
  __openChange = output<boolean>({ alias: "openChange" });
  open = $model(this.__open, this.__openChange);

  required = input(false, { transform: transformBoolean });
  disabled = input(false, { transform: transformBoolean });

  items = input<T[]>();
  trackByFn = input<(item: T, index: number) => any>((item) => item);
  getChildrenFn = input<(item: T, index: number, depth: number) => T[]>();

  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  selectMode = input("single" as M);
  contentClass = input<string>();
  contentStyle = input<string>();
  multiSelectionDisplayDirection = input<"vertical" | "horizontal">();
  hideSelectAll = input(false, { transform: transformBoolean });
  placeholder = input<string>();

  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>(
    "contentEl",
    { read: ElementRef },
  );
  dropdownControl = viewChild.required<SdDropdownControl>("dropdown");
  dropdownPopupElRef = viewChild.required<any, ElementRef<HTMLElement>>(
    "dropdownPopup",
    { read: ElementRef },
  );

  headerTemplateRef = contentChild<any, TemplateRef<void>>("header", { read: TemplateRef });
  beforeTemplateRef = contentChild<any, TemplateRef<void>>("before", { read: TemplateRef });
  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(
    SdItemOfTemplateDirective,
    {
      read: TemplateRef,
    },
  );

  itemControls = $signal<SdSelectItemControl[]>([]);

  errorMessage = $computed(() => {
    const errorMessages: string[] = [];

    if (this.required() && this.value() === undefined) {
      errorMessages.push("선택된 항목이 없습니다.");
    }

    const fullErrorMessage = errorMessages.join("\r\n");
    return !StringUtils.isNullOrEmpty(fullErrorMessage) ? fullErrorMessage : undefined;
  });

  constructor() {
    $afterRenderEffect(() => {
      const selectedItemControls = this.itemControls()
        .filter((itemControl) => itemControl.isSelected());
      // const selectedItemEls = selectedItemControls.map((item) => item.elRef.nativeElement);
      // const innerHTML = selectedItemEls
      //   .map((el) => el.findFirst("> ._content")?.innerHTML ?? "")
      //   .map((item) => `<div style="display: inline-block">${item}</div>`)
      //   .join(this.multiSelectionDisplayDirection() === "vertical" ? "<div class='p-sm-0'></div>" : ", ");
      const innerHTML = selectedItemControls
        .map(ctl => ctl.contentHTML())
        .map((item) => `<div style="display: inline-block">${item}</div>`)
        .join(this.multiSelectionDisplayDirection() === "vertical"
          ? "<div class='p-sm-0'></div>"
          : ", ");

      if (innerHTML === "") {
        if (this.placeholder() !== undefined) {
          this.contentElRef().nativeElement.innerHTML = `<span class='sd-text-color-grey-default'>${this.placeholder()}</span>`;
        }
        else {
          this.contentElRef().nativeElement.innerHTML = `&nbsp;`;
        }
      }
      else {
        this.contentElRef().nativeElement.innerHTML = innerHTML;
      }
    });
  }

  onPopupKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      event.stopPropagation();

      if (document.activeElement instanceof HTMLElement) {
        const focusableEls = this.dropdownPopupElRef().nativeElement.findFocusableAll();
        const currIndex = focusableEls.indexOf(document.activeElement);

        if (event.key === "ArrowUp") {
          if (currIndex === 0) {
            this.dropdownControl().contentElRef().nativeElement.focus();
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

  getIsSelectedItemControl(itemControl: SdSelectItemControl): boolean {
    if (this.selectMode() === "multi") {
      const itemKeyValues = this.value() as any[] | undefined;
      return itemKeyValues?.includes(itemControl.value()) ?? false;
    }
    else {
      const itemKeyValue = this.value();
      return itemKeyValue === itemControl.value();
    }
  }

  onItemControlClick(itemControl: SdSelectItemControl, close: boolean) {
    if (this.selectMode() === "multi") {
      this.value.update((v) => {
        const r = [...((v ?? []) as any[])];
        if (r.includes(itemControl.value())) {
          r.remove(itemControl.value());
        }
        else {
          r.push(itemControl.value());
        }
        return r;
      });
    }
    else {
      this.value.set(itemControl.value());
    }

    if (close) {
      this.dropdownControl().open.set(false);
    }
  }

  onSelectAllButtonClick(check: boolean) {
    const value = check
      ? this.itemControls()
        .filter(item => !item.hidden() && !item.disabled())
        .map((item) => item.value())
      : [];

    this.value.set(value);
  }

  protected readonly rowOfListType!: {
    items: T[];
    depth: number;
  };
}

export type TSelectValue<T> = {
  multi: T[];
  single: T;
};
