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
import { setupRipple } from "../../core/ripple/setupRipple";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCollapse, SdCollapseIcon, NgTemplateOutlet, NgIcon],
  template: `
    <div class="_content" [style]="contentStyle()" [class]="contentClass()" tabindex="0" (click)="onContentClick()" (keydown.enter)="onContentClick()">
      @if (layout() === "accordion" && hasChildren()) {
        <sd-collapse-icon [open]="open()" />
      }
      @if (selectedIcon() !== undefined && !hasChildren()) {
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
          align-items: center;
          padding: var(--gap-sm) var(--gap-default);
          cursor: pointer;
          gap: var(--gap-sm);

          > ._label {
            flex: 1;
          }
        }

        &:hover > ._content {
          background: var(--trans-lighter);
        }

        &[data-sd-selected="true"] > ._content {
          background: var(--trans-lighter);
          font-weight: bold;
        }

        &[data-sd-readonly="true"] {
          > ._content {
            cursor: default;
          }

          &:hover > ._content {
            background: transparent;
          }
        }

        &[data-sd-layout="flat"] {
          > ._content {
            font-size: 0.85em;
            opacity: 0.7;
            cursor: default;
          }

          &:hover > ._content {
            background: transparent;
          }
        }

        &[data-sd-has-children="false"] {
          > ._content {
            padding-left: calc(var(--gap-default) + var(--gap-sm) + 0.75em);
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-layout]": "layout()",
    "[attr.data-sd-selected]": "selected()",
    "[attr.data-sd-readonly]": "readonly()",
    "[attr.data-sd-has-children]": "hasChildren()",
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

  constructor() {
    setupRipple(() => !this.readonly() && this.layout() !== "flat");
  }

  onContentClick(): void {
    if (this.readonly()) return;
    if (this.layout() === "accordion" && this.hasChildren()) {
      this.open.update((v) => !v);
    }
  }
}
