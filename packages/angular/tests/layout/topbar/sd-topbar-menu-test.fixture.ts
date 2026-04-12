import { Component, signal } from "@angular/core";
import { tablerHome } from "@ng-icons/tabler-icons";
import { SdTopbarMenu } from "../../../src/layout/topbar/sd-topbar-menu";
import type { SdMenu } from "../../../src/core/routing/menu-utils";

@Component({
  selector: "sd-topbar-menu-basic-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuBasicTest {
  menus = signal<SdMenu[]>([
    { title: "Menu 1", codeChain: ["m1"] },
    { title: "Menu 2", codeChain: ["m2"] },
    { title: "Menu 3", codeChain: ["m3"] },
  ]);
}

@Component({
  selector: "sd-topbar-menu-icon-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuIconTest {
  menus = signal<SdMenu[]>([
    { title: "With Icon", codeChain: ["icon"], icon: tablerHome },
  ]);
}

@Component({
  selector: "sd-topbar-menu-children-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuChildrenTest {
  menus = signal<SdMenu[]>([
    {
      title: "Parent",
      codeChain: ["parent"],
      children: [
        {
          title: "Child 1",
          codeChain: ["parent", "child1"],
          children: [
            { title: "Grandchild 1", codeChain: ["parent", "child1", "gc1"] },
          ],
        },
        { title: "Child 2", codeChain: ["parent", "child2"] },
      ],
    },
  ]);
}

@Component({
  selector: "sd-topbar-menu-url-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuUrlTest {
  menus = signal<SdMenu[]>([
    { title: "External", codeChain: ["ext"], url: "https://example.com" },
  ]);
}

@Component({
  selector: "sd-topbar-menu-querystring-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuQueryStringTest {
  menus = signal<SdMenu[]>([
    { title: "QS Page", codeChain: ["module", "page?key=value"] },
  ]);
}

@Component({
  selector: "sd-topbar-menu-custom-selected-fn-test",
  template: `<sd-topbar-menu [menus]="menus()" [getMenuIsSelectedFn]="selFn" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuCustomSelectedFnTest {
  menus = signal<SdMenu[]>([
    { title: "Custom", codeChain: ["custom"] },
  ]);
  selFn = (_menu: SdMenu): boolean => true;
}

@Component({
  selector: "sd-topbar-menu-depth-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuDepthTest {
  menus = signal<SdMenu[]>([
    {
      title: "Root",
      codeChain: ["root"],
      children: [
        {
          title: "Level 1",
          codeChain: ["root", "level1"],
          children: [
            {
              title: "Level 2",
              codeChain: ["root", "level1", "level2"],
              children: [
                {
                  title: "Level 3",
                  codeChain: ["root", "level1", "level2", "level3"],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
}
