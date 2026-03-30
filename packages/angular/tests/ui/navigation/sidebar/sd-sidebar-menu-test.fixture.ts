import { Component, signal } from "@angular/core";
import { tablerHome } from "@ng-icons/tabler-icons";
import {
  SdSidebarMenuControl,
  type ISdSidebarMenu,
} from "../../../../src/ui/navigation/sidebar/sd-sidebar-menu.control";

@Component({
  selector: "sd-sidebar-menu-flat-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuFlatTest {
  menus = signal<ISdSidebarMenu[]>([
    { title: "Menu 1", codeChain: ["m1"] },
    { title: "Menu 2", codeChain: ["m2"] },
    { title: "Menu 3", codeChain: ["m3"] },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-accordion-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuAccordionTest {
  menus = signal<ISdSidebarMenu[]>([
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
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuForceLayoutTest {
  menus = signal<ISdSidebarMenu[]>(
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
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuChildrenTest {
  menus = signal<ISdSidebarMenu[]>([
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
  selector: "sd-sidebar-menu-icon-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuIconTest {
  menus = signal<ISdSidebarMenu[]>([
    { title: "With Icon", codeChain: ["icon"], icon: tablerHome },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-url-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuUrlTest {
  menus = signal<ISdSidebarMenu[]>([
    { title: "External", codeChain: ["ext"], url: "https://example.com" },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-querystring-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuQueryStringTest {
  menus = signal<ISdSidebarMenu[]>([
    { title: "QS Page", codeChain: ["module", "page?key=value"] },
  ]);
}

@Component({
  selector: "sd-sidebar-menu-custom-selected-fn-test",
  template: `<sd-sidebar-menu [menus]="menus()" [getMenuIsSelectedFn]="selFn" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class SidebarMenuCustomSelectedFnTest {
  menus = signal<ISdSidebarMenu[]>([
    { title: "Custom", codeChain: ["custom"] },
  ]);
  selFn = (_menu: ISdSidebarMenu): boolean => true;
}
