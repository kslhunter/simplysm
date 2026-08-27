import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { injectFullPageCodeSignal } from "../../core/routing/injectFullPageCodeSignal";
import {
  type SdMenu,
  getMenuRouterLinkOption as menuRouterLinkOption,
  getIsMenuSelected as menuIsSelected,
} from "../../core/routing/menu-utils";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplate } from "../../core/template/sd-typed-template";
import { SdRouterLink } from "../../core/routing/sd-router-link";
import { SdList } from "../../controls/list/sd-list";
import { SdListItem } from "../../controls/list/sd-list-item";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { NgIcon } from "@ng-icons/core";
import { tablerFoldDown, tablerFoldUp } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-sidebar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    SdTypedTemplate,
    SdRouterLink,
    SdList,
    SdListItem,
    SdAnchor,
    NgIcon,
  ],
  host: {
    "class": "flex-column fill",
    "[attr.data-sd-root-layout]": "rootLayout()",
  },
  template: `
    <div class="control-header p-default flex-row">
      <div class="flex-fill"><b>MENU</b></div>
      @if (hasExpandable()) {
        <sd-anchor
          [theme]="'gray'"
          [disabled]="isAllExpanded()"
          [attr.title]="'전체 펼치기'"
          (click)="expandAll()"
        >
          <ng-icon [svg]="icons.tablerFoldDown" />
        </sd-anchor>
        <sd-anchor
          [theme]="'gray'"
          [disabled]="isAllCollapsed()"
          [attr.title]="'전체 접기'"
          (click)="collapseAll()"
        >
          <ng-icon [svg]="icons.tablerFoldUp" />
        </sd-anchor>
      }
    </div>

    <sd-list class="flex-fill" [inset]="true">
      <ng-template
        [ngTemplateOutlet]="itemTpl"
        [ngTemplateOutletContext]="{ menus: menus(), depth: 0 }"
      ></ng-template>
    </sd-list>

    <ng-template #itemTpl [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      @for (menu of currMenus; track menu.codeChain.join(".")) {
        <sd-list-item
          [sdRouterLink]="getMenuRouterLinkOption(menu)"
          (click)="onMenuClick(menu)"
          [selected]="getIsMenuSelected(menu)"
          [layout]="depth === 0 && rootLayout() === 'flat' ? 'flat' : 'accordion'"
          [open]="getIsMenuExpanded(menu)"
          (openChange)="onMenuOpenChange(menu, $event)"
        >
          @if (menu.icon) {
            <ng-icon [svg]="menu.icon" />
          }
          {{ menu.title }}
          @if (menu.children) {
            <sd-list [inset]="true">
              <ng-template
                [ngTemplateOutlet]="itemTpl"
                [ngTemplateOutletInjector]="'outlet'"
                [ngTemplateOutletContext]="{
                  menus: menu.children,
                  depth: depth + 1,
                }"
              ></ng-template>
            </sd-list>
          }
        </sd-list-item>
      }
    </ng-template>
  `,
  styles: [
    /* language=SCSS */ `
      sd-sidebar-menu {
        > .control-header {
          align-items: center;
          gap: var(--sd-gap-xs);
        }

        &[data-sd-root-layout="flat"] {
          > sd-list[data-sd-inset="true"]
            > sd-list-item
            > sd-collapse
            > ._content
            > ._children
            > sd-list {
            background-color: transparent;
          }
        }
      }
    `,
  ],
})
export class SdSidebarMenu {
  menus = input<SdMenu[]>([]);
  layout = input<"accordion" | "accordion-expanded" | "flat">();
  getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();

  /**
   * 펼쳐진 메뉴 코드(`codeChain.join(".")`) 목록.
   *
   * 미지정(`undefined`)이면 `layout` 이 정하는 기본 펼침 상태를 따름.
   * 사용자가 토글하거나 호스트가 값을 세팅하면 그 값이 단일 진리원이 되며,
   * 이후 `menus` 가 다시 계산돼도 상태가 유지됨.
   */
  expandedMenuCodes = model<string[] | undefined>(undefined);

  fullPageCode = injectFullPageCodeSignal();

  rootLayout = computed(() => this.layout() ?? (this.menus().length <= 3 ? "flat" : "accordion"));

  // 접기/펼치기가 가능한 메뉴 코드.
  // flat 로 렌더되는 depth-0 그룹은 항상 펼쳐진 구조라 대상에서 제외(SdListItem.childrenOpen).
  private readonly _expandableCodes = computed(() => {
    const rootIsFlat = this.rootLayout() === "flat";
    const result: string[] = [];

    function walk(menus: SdMenu[], depth: number): void {
      for (const menu of menus) {
        if (menu.children == null) continue;
        if (!(rootIsFlat && depth === 0)) {
          result.push(menu.codeChain.join("."));
        }
        walk(menu.children, depth + 1);
      }
    }

    walk(this.menus(), 0);
    return result;
  });

  // accordion-expanded: 하위 보유 메뉴 전체를 펼친 채로 시작. 그 외는 접힘 시작.
  private readonly _expandedCodeSet = computed(() => {
    const codes =
      this.expandedMenuCodes() ??
      (this.rootLayout() === "accordion-expanded" ? this._expandableCodes() : []);
    return new Set(codes);
  });

  hasExpandable = computed(() => this._expandableCodes().length > 0);

  isAllExpanded = computed(() => {
    const codes = this._expandableCodes();
    if (codes.length === 0) return false;
    const expandedSet = this._expandedCodeSet();
    return codes.every((code) => expandedSet.has(code));
  });

  isAllCollapsed = computed(() => {
    const codes = this._expandableCodes();
    if (codes.length === 0) return true;
    const expandedSet = this._expandedCodeSet();
    return codes.every((code) => !expandedSet.has(code));
  });

  expandAll(): void {
    this.expandedMenuCodes.set([...this._expandableCodes()]);
  }

  collapseAll(): void {
    this.expandedMenuCodes.set([]);
  }

  getIsMenuExpanded(menu: SdMenu): boolean {
    return this._expandedCodeSet().has(menu.codeChain.join("."));
  }

  onMenuOpenChange(menu: SdMenu, open: boolean): void {
    const code = menu.codeChain.join(".");
    const nextSet = new Set(this._expandedCodeSet());
    if (open) {
      nextSet.add(code);
    } else {
      nextSet.delete(code);
    }
    this.expandedMenuCodes.set([...nextSet]);
  }

  getMenuRouterLinkOption(
    menu: SdMenu,
  ): { link: string; queryParams: Record<string, string> | undefined } | undefined {
    return menuRouterLinkOption(menu);
  }

  getIsMenuSelected(menu: SdMenu): boolean {
    return menuIsSelected(menu, this.fullPageCode(), this.getMenuIsSelectedFn());
  }

  onMenuClick(menu: SdMenu): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }
  }

  protected readonly icons = {
    tablerFoldDown,
    tablerFoldUp,
  };

  protected readonly itemTemplateType!: {
    menus: SdMenu[];
    depth: number;
  };
}
