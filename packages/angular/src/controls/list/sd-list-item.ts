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
    <div
      class="_content"
      [style]="contentStyle()"
      [class]="contentClass()"
      tabindex="0"
      (click)="onContentClick()"
      (keydown.enter)="onContentClick()"
      [sdRipple]="!readonly() && !(layout() === 'flat' && hasChildren())"
    >
      @if (selectedIcon() != null && !hasChildren()) {
        <ng-icon
          [class.tx-primary]="selected()"
          [class.tx-faint]="!selected()"
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
        <div class="_children">
          @if (layout() === "accordion") {
            <div class="_indent-guide"></div>
          }
          <ng-content select="sd-list" />
        </div>
      </sd-collapse>
    }
  `,
  styles: [
    /* language=SCSS */ `
      sd-list-item {
        display: block;

        > ._content {
          display: flex;
          padding: var(--sd-gap-sm) var(--sd-gap-default);
          cursor: pointer;
          gap: var(--sd-gap-xs);
          border-radius: var(--sd-radius-default);
          transition: background var(--sd-animation-duration) ease-in;

          > ._label {
            flex: 1 1 auto;
            overflow: auto;
          }

          &:focus-visible {
            outline: none;
            transition: background var(--sd-animation-duration) ease-out;
            background-color: var(--sd-bg-state-hover);
          }
        }

        &[data-sd-selected="true"] > ._content {
          background-color: var(--sd-bg-state-selected);
          font-weight: bold;
        }

        &[data-sd-has-selected-icon="true"][data-sd-selected="true"] > ._content {
          color: var(--sd-tx-default);

          &:hover {
            background-color: var(--sd-bg-state-hover);
          }
        }

        &[data-sd-readonly="true"] {
          > ._content {
            cursor: default;
          }
        }

        // 중첩 자식 영역: 세로 가이드선을 그리기 위한 기준 컨테이너.
        // 깊이별 들여쓰기는 중첩 sd-list 의 padding 으로 누적되므로, 이 컨테이너
        // 좌측은 항상 현재 항목 기준이라 가이드선 위치는 고정값이면 충분함.
        > sd-collapse > ._content > ._children {
          position: relative;

          > ._indent-guide {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 1em;
            width: 0;
            border-left: 1px solid var(--sd-bd-soft);
            pointer-events: none;
          }
        }

        &[data-sd-layout="accordion"] {
          &:not([data-sd-readonly="true"]) {
            > ._content:hover {
              transition: background var(--sd-animation-duration) ease-out;
              background-color: var(--sd-bg-state-hover);
            }
          }

          // 깊이별 들여쓰기: accordion 항목의 자식 리스트를 한 칸씩 누적 들여씀.
          // (flat 항목의 자식 리스트는 들여쓰지 않음)
          > sd-collapse > ._content > ._children > sd-list > sd-list-item > ._content {
            padding-left: 1.5em;
          }
        }

        &[data-sd-layout="flat"][data-sd-has-children="true"] {
          > ._content {
            display: block;
            background-color: transparent;
            cursor: default;
            font-size: var(--sd-font-size-sm);
            opacity: 0.7;
            margin: 0;
          }
        }
      }

      .sd-theme-mobile > sd-list-item {
        > ._content:hover {
          background-color: transparent;
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
