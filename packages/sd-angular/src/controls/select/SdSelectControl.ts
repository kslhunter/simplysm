import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  ElementRef,
  inject,
  input,
  model,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import {
  SdItemOfTemplateContext,
  SdItemOfTemplateDirective,
} from "../../directives/SdItemOfTemplateDirective";
import { SdRippleDirective } from "../../directives/SdRippleDirective";
import { SdTypedTemplateDirective } from "../../directives/SdTypedTemplateDirective";
import { SdAngularConfigProvider } from "../../providers/SdAngularConfigProvider";
import { setupInvalid } from "../../utils/setups/setupInvalid";
import { transformBoolean } from "../../utils/transforms/tramsformBoolean";
import { SdGapControl } from "../SdGapControl";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdDropdownControl } from "../dropdown/SdDropdownControl";
import { SdDropdownPopupControl } from "../dropdown/SdDropdownPopupControl";
import { $afterRenderEffect } from "../../utils/bindings/$afterRenderEffect";
import { SdAnchorControl } from "../SdAnchorControl";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdGapControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdRippleDirective,
    FaIconComponent,
    SdAnchorControl,
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
          <fa-icon [icon]="icons.caretDown" />
        </div>
      </div>

      @if (!disabled()) {
        <ng-content select="sd-select-button" />
      }

      <sd-dropdown-popup #dropdownPopup (keydown)="onPopupKeydown($event)">
        @if (!items()) {
          <div class="flex-column">
            @if (headerTplRef()) {
              <div>
                <ng-template [ngTemplateOutlet]="headerTplRef()!" />
              </div>
            }

            <div class="flex-fill">
              <ng-content></ng-content>
            </div>
          </div>
        } @else {
          <div class="flex-column">
            @if (headerTplRef()) {
              <div>
                <ng-template [ngTemplateOutlet]="headerTplRef()!" />
              </div>
            }

            @if (selectMode() === "multi" && !hideSelectAll()) {
              <div class="p-sm-default">
                <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
                <sd-gap width="sm"></sd-gap>
                <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
              </div>
            }

            <div class="flex-fill">
              <ng-template [ngTemplateOutlet]="beforeTplRef() ?? null" />
              <ng-template
                #rowOfListTpl
                [typed]="rowOfListType"
                let-items="items"
                let-depth="depth"
              >
                @for (item of items; let index = $index; track trackByFn()(item, index)) {
                  <div class="_sd-select-item">
                    <ng-template
                      [ngTemplateOutlet]="itemTplRef() ?? null"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: index,
                        depth: depth,
                      }"
                    ></ng-template>

                    @if (
                      getChildrenFn() &&
                      getChildrenFn()!(item, index, depth) &&
                      getChildrenFn()!(item, index, depth).length > 0
                    ) {
                      <div class="_children">
                        <ng-template
                          [ngTemplateOutlet]="rowOfListTpl"
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
                [ngTemplateOutlet]="rowOfListTpl"
                [ngTemplateOutletContext]="{ items: items(), depth: 0 }"
              ></ng-template>
            </div>
          </div>
        }
      </sd-dropdown-popup>
    </sd-dropdown>
  `,

  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      sd-select {
        display: block;
        width: 100%;
        min-width: 10em;

        > sd-dropdown {
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

        &[data-sd-disabled="true"] {
          > sd-dropdown {
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
            &:has(:focus) {
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
    `,
  ],
  host: {
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-size]": "size()",
  },
})
export class SdSelectControl<M extends "single" | "multi", T> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  value = model<TSelectModeValue<any>[M]>();

  open = model(false);

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

  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", {
    read: ElementRef,
  });
  dropdownControl = viewChild.required<SdDropdownControl>("dropdown");
  dropdownPopupElRef = viewChild.required<any, ElementRef<HTMLElement>>("dropdownPopup", {
    read: ElementRef,
  });

  headerTplRef = contentChild<any, TemplateRef<void>>("headerTpl", { read: TemplateRef });
  beforeTplRef = contentChild<any, TemplateRef<void>>("beforeTpl", { read: TemplateRef });
  itemTplRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(
    SdItemOfTemplateDirective,
    { read: TemplateRef },
  );

  // itemControls = $signal<SdSelectItemControl[]>([]);
  itemControls = contentChildren(SdSelectItemControl);

  constructor() {
    setupInvalid(() => {
      const errorMessages: string[] = [];

      if (this.required() && this.value() === undefined) {
        errorMessages.push("선택된 항목이 없습니다.");
      }

      return errorMessages.join("\r\n");
    });

    $afterRenderEffect(() => {
      const selectedItemControls = this.itemControls().filter((itemControl) =>
        itemControl.isSelected(),
      );
      // const selectedItemEls = selectedItemControls.map((item) => item.elRef.nativeElement);
      // const innerHTML = selectedItemEls
      //   .map((el) => el.findFirst("> ._content")?.innerHTML ?? "")
      //   .map((item) => `<div style="display: inline-block">${item}</div>`)
      //   .join(this.multiSelectionDisplayDirection() === "vertical" ? "<div class='p-sm-0'></div>" : ", ");
      const innerHTML = selectedItemControls
        .map((ctl) => ctl.contentHTML())
        .map((item) => `<span style="display: inline">${item}</span>`)
        .join(
          this.multiSelectionDisplayDirection() === "vertical"
            ? "<div class='p-sm-0'></div>"
            : ", ",
        );

      if (innerHTML === "") {
        if (this.placeholder() !== undefined) {
          this.contentElRef().nativeElement.innerHTML = `<span class='sd-text-color-grey-default'>${this.placeholder()}</span>`;
        } else {
          this.contentElRef().nativeElement.innerHTML = `&nbsp;`;
        }
      } else {
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
            this.dropdownControl().elRef.nativeElement.focus();
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
    if (this.selectMode() === "multi") {
      const itemKeyValues = this.value() as any[] | undefined;
      return itemKeyValues?.includes(itemControl.value()) ?? false;
    } else {
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
        } else {
          r.push(itemControl.value());
        }
        return r;
      });
    } else {
      this.value.set(itemControl.value());
    }

    if (close) {
      this.dropdownControl().open.set(false);
    }
  }

  onSelectAllButtonClick(check: boolean) {
    const value = check
      ? this.itemControls()
          .filter((item) => !item.hidden() && !item.disabled())
          .map((item) => item.value())
      : [];

    this.value.set(value);
  }

  protected readonly rowOfListType!: {
    items: T[];
    depth: number;
  };
}

export type TSelectModeValue<T> = {
  multi: T[];
  single: T;
};
