import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  forwardRef,
  inject,
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
      [style.padding-left]="indentPadding()"
      [class]="contentClass()"
      tabindex="0"
      (click)="onContentClick()"
      (keydown.enter)="onContentClick()"
      [sdRipple]="!readonly() && !(layout() === 'flat' && hasChildren())"
    >
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
        <div class="_children">
          @if (layout() === "accordion") {
            <div class="_indent-guide" [style.left]="guideLeft()"></div>
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
          padding: var(--gap-sm) var(--gap-default);
          cursor: pointer;
          gap: var(--gap-xs);
          border-radius: var(--border-radius-default);
          transition: background var(--animation-duration) ease-in;

          > ._label {
            flex: 1 1 auto;
            overflow: auto;
          }

          &:focus-visible {
            outline: none;
            transition: background var(--animation-duration) ease-out;
            background: var(--trans-lighter);
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

        // 중첩 자식 영역: 세로 가이드선을 그리기 위한 기준 컨테이너
        > sd-collapse > ._content > ._children {
          position: relative;

          > ._indent-guide {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 0;
            border-left: 1px solid var(--border-color-default);
            pointer-events: none;
          }
        }

        &[data-sd-layout="accordion"] {
          &:not([data-sd-readonly="true"]) {
            > ._content:hover {
              transition: background var(--animation-duration) ease-out;
              background: var(--trans-lighter);
            }
          }

          //> sd-collapse > ._content > ._children > sd-list {
          //  padding: var(--gap-xs) 0;
          //}
        }

        &[data-sd-layout="flat"][data-sd-has-children="true"] {
          > ._content {
            display: block;
            background: transparent;
            cursor: default;
            font-size: var(--font-size-sm);
            opacity: 0.7;
            margin: 0;
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

  // 상위 아이템을 주입해 중첩 깊이(레벨)를 추적
  private readonly _parentItem = inject<SdListItem>(
    forwardRef(() => SdListItem),
    {
      optional: true,
      skipSelf: true,
    },
  );

  // accordion(트리) 깊이만 셈. flat(섹션 그룹)은 들여쓰기 대상이 아니므로 0,
  // flat 하위의 accordion 트리는 자체 루트(1)부터 새로 깊이를 셈.
  level = computed((): number => {
    if (this.layout() !== "accordion") return 0;
    return (this._parentItem?.level() ?? 0) + 1;
  });

  // accordion 트리 깊이별 좌측 들여쓰기 (트리 루트·flat은 기본 패딩 유지)
  indentPadding = computed(() => {
    if (this.level() <= 1) return undefined;
    return `calc(var(--gap-default) + ${(this.level() - 1) * 1.5}em)`;
  });

  // 자식 영역에 그릴 세로 가이드선의 좌측 위치 (현재 레벨 기준 + 반 칸)
  guideLeft = computed(() => `calc(var(--gap-default) + ${(this.level() - 1) * 1.5}em + 0.75em)`);

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
