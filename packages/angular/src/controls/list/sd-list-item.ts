import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { NgIcon } from "@ng-icons/core";
import { SdCollapse } from "../collapse/sd-collapse";
import { SdCollapseIcon } from "../collapse/sd-collapse-icon";
import { SdList } from "./sd-list";
import { SdRipple } from "../../core/ripple/sd-ripple";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCollapse, SdCollapseIcon, NgTemplateOutlet, NgIcon, SdRipple],
  template: `
    <div class="_content" [style]="contentStyle()" [class]="contentClass()" tabindex="0" (click)="onContentClick()" (keydown.enter)="onContentClick()" [sdRipple]="!readonly() && !(layout() === 'flat' && hasChildren())">
      @if (selectedIcon() != null && !hasChildren()) {
        <ng-icon
          [class.tx-theme-primary-default]="selected()"
          [class.tx-trans-lightest]="!selected()"
          [svg]="selectedIcon()!"
        />
      }
      <div class="_label">
        <ng-content />
      </div>
      @if (toolTpl()) {
        <div class="_tool">
          <ng-template [ngTemplateOutlet]="toolTpl()!" />
        </div>
      }
      @if (layout() === "accordion" && hasChildren()) {
        <sd-collapse-icon [open]="open()" />
      }
    </div>
    @if (hasChildren()) {
      <sd-collapse [open]="childrenOpen()">
        <ng-content select="sd-list" />
      </sd-collapse>
    }
  `,
  styles: [
    /* language=SCSS */ `
      sd-list-item {
        display: block;

        > ._content {
          display: flex;
          padding: var(--gap-sm) var(--gap-default);
          cursor: pointer;
          gap: var(--gap-xs);

          > ._label {
            flex: 1 1 auto;
            overflow: auto;
          }
        }

        &[data-sd-selected="true"] > ._content {
          background: var(--trans-lighter);
          font-weight: bold;
        }

        &[data-sd-has-selected-icon="true"][data-sd-selected="true"] > ._content {
          color: var(--text-trans-default);

          &:hover {
            background: var(--trans-lighter);
          }
        }

        &[data-sd-readonly="true"] {
          > ._content {
            cursor: default;
          }
        }

        &[data-sd-layout="accordion"] {
          &:not([data-sd-readonly="true"]) {
            > ._content:hover {
              background: var(--trans-lighter);
            }
          }

          > sd-collapse > ._content > sd-list {
            padding: var(--gap-xs) 0;
          }
        }

        &[data-sd-layout="flat"][data-sd-has-children="true"] {
          > ._content {
            display: block;
            background: transparent;
            cursor: default;
            font-size: var(--font-size-sm);
            opacity: 0.7;
          }
        }
      }

      .sd-theme-mobile > sd-list-item {
        > ._content:hover {
          background: transparent;
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-layout]": "layout()",
    "[attr.data-sd-open]": "open()",
    "[attr.data-sd-selected]": "selected()",
    "[attr.data-sd-readonly]": "readonly()",
    "[attr.data-sd-has-children]": "hasChildren()",
    "[attr.data-sd-has-selected-icon]": "selectedIcon() != null",
  },
})
export class SdListItem {
  layout = input<"accordion" | "flat">("accordion");
  open = model(false);
  selected = input(false, { transform: booleanAttribute });
  selectedIcon = input<string>();
  readonly = input(false, { transform: booleanAttribute });
  contentStyle = input<string>();
  contentClass = input<string>();

  toolTpl = contentChild<TemplateRef<void>>("toolTpl");

  private readonly _childLists = contentChildren(SdList);

  hasChildren = computed(() => this._childLists().length > 0);

  childrenOpen = computed(() => {
    return this.layout() === "flat" ? true : this.open();
  });

  onContentClick(): void {
    if (this.readonly()) return;
    if (this.layout() === "accordion" && this.hasChildren()) {
      this.open.update((v) => !v);
    }
  }
}
