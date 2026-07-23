import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  type Signal,
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
        // 가이드선 좌측은 현재 항목의 accordion 깊이(--sd-list-item-depth)에
        // 비례해 누적됨. 깊이는 각 항목이 DI 로 자기산출해 host 변수로 상속됨.
        // 오프셋 0.65em 은 부모 아이콘(1.3em)의 정중앙이라 세로선이 아이콘을 관통함.
        > sd-collapse > ._content > ._children {
          position: relative;

          > ._indent-guide {
            position: absolute;
            top: 0;
            bottom: 0;
            left: calc(0.65em + 1.3em * var(--sd-list-item-depth, 0));
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

          // 깊이별 들여쓰기: 자식 항목의 accordion 깊이(--sd-list-item-depth)에
          // 비례해 누적. 한 단계 1.3em(아이콘 한 칸): depth1=1.3em, depth2=2.6em.
          // (flat 항목의 자식 리스트는 깊이를 증가시키지 않아 들여쓰지 않음)
          > sd-collapse > ._content > ._children > sd-list > sd-list-item > ._content {
            padding-left: calc(1.3em * var(--sd-list-item-depth, 1));
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
    "[style.--sd-list-item-depth]": "depth()",
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

  private readonly _parentItem = inject(SdListItem, { optional: true, skipSelf: true });

  // accordion 조상 수 = 들여쓰기 단계. flat 조상은 단계에 포함하지 않음.
  readonly depth: Signal<number> = computed(() =>
    this._parentItem == null
      ? 0
      : this._parentItem.depth() + (this._parentItem.layout() === "accordion" ? 1 : 0),
  );

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
