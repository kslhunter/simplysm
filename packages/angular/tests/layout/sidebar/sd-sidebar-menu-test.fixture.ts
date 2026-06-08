import { Component, signal } from "@angular/core";
import { tablerHome } from "@ng-icons/tabler-icons";
import { SdSidebarMenu } from "../../../src/layout/sidebar/sd-sidebar-menu";
import type { SdMenu } from "../../../src/core/routing/menu-utils";

@Component({
  selector: "sd-sidebar-menu-flat-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuFlatTest {
  menus = signal<SdMenu[]>([
    { title: "Menu 1", codeChain: ["m1"] },
    { title: "Menu 2", codeChain: ["m2"] },
    { title: "Menu 3", codeChain: ["m3"] },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-accordion-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuAccordionTest {
  menus = signal<SdMenu[]>([
    { title: "Menu 1", codeChain: ["m1"] },
    { title: "Menu 2", codeChain: ["m2"] },
    { title: "Menu 3", codeChain: ["m3"] },
    { title: "Menu 4", codeChain: ["m4"] },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-force-layout-test",
  template: `<sd-sidebar-menu [menus]="menus()" [layout]="'flat'" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuForceLayoutTest {
  menus = signal<SdMenu[]>(
    Array.from({ length: 10 }, (_, i) => ({
      title: `Menu ${i + 1}`,
      codeChain: [`m${i + 1}`],
    })),
  );
}

@Component({
  selector: "sd-sidebar-menu-children-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuChildrenTest {
  menus = signal<SdMenu[]>([
    {
      title: "Parent",
      codeChain: ["parent"],
      children: [
        { title: "Child 1", codeChain: ["parent", "child1"] },
        { title: "Child 2", codeChain: ["parent", "child2"] },
      ],
    },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-expanded-test",
  template: `<sd-sidebar-menu [menus]="menus()" [layout]="'accordion-expanded'" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuExpandedTest {
  menus = signal<SdMenu[]>([
    {
      title: "Parent 1",
      codeChain: ["p1"],
      children: [
        { title: "Child 1", codeChain: ["p1", "c1"] },
        {
          title: "Child 2",
          codeChain: ["p1", "c2"],
          children: [{ title: "Grandchild", codeChain: ["p1", "c2", "g1"] }],
        },
      ],
    },
    {
      title: "Parent 2",
      codeChain: ["p2"],
      children: [{ title: "Child 3", codeChain: ["p2", "c3"] }],
    },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-icon-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuIconTest {
  menus = signal<SdMenu[]>([
    { title: "With Icon", codeChain: ["icon"], icon: tablerHome },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-url-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuUrlTest {
  menus = signal<SdMenu[]>([
    { title: "External", codeChain: ["ext"], url: "https://example.com" },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-querystring-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuQueryStringTest {
  menus = signal<SdMenu[]>([
    { title: "QS Page", codeChain: ["module", "page?key=value"] },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-custom-selected-fn-test",
  template: `<sd-sidebar-menu [menus]="menus()" [getMenuIsSelectedFn]="selFn" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class SidebarMenuCustomSelectedFnTest {
  menus = signal<SdMenu[]>([
    { title: "Custom", codeChain: ["custom"] },
  ]);
  selFn = (_menu: SdMenu): boolean => true;
}
