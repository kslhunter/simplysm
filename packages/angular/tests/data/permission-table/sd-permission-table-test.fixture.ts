import { Component, signal } from "@angular/core";
import type { SdPermission } from "../../../src/core/app-structure/sd-app-structure.types";
import { SdPermissionTable } from "../../../src/data/permission-table/sd-permission-table";

@Component({
  selector: "sd-permission-table-empty-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" />`,
  standalone: true,
  imports: [SdPermissionTable],
})
export class SdPermissionTableEmptyTest {
  items = signal<SdPermission[]>([]);
  value = signal<Record<string, boolean>>({});
}

@Component({
  selector: "sd-permission-table-two-level-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" />`,
  standalone: true,
  imports: [SdPermissionTable],
})
export class SdPermissionTableTwoLevelTest {
  items = signal<SdPermission[]>([
    {
      title: "모듈A",
      codeChain: ["moduleA"],
      modules: undefined,
      perms: undefined,
      children: [
        {
          title: "기능1",
          codeChain: ["moduleA", "func1"],
          modules: undefined,
          perms: ["use", "edit"],
          children: undefined,
        },
        {
          title: "기능2",
          codeChain: ["moduleA", "func2"],
          modules: undefined,
          perms: ["use"],
          children: undefined,
        },
      ],
    },
  ]);
  value = signal<Record<string, boolean>>({});
}

@Component({
  selector: "sd-permission-table-three-level-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" />`,
  standalone: true,
  imports: [SdPermissionTable],
})
export class SdPermissionTableThreeLevelTest {
  items = signal<SdPermission[]>([
    {
      title: "최상위",
      codeChain: ["top"],
      modules: undefined,
      perms: undefined,
      children: [
        {
          title: "중간",
          codeChain: ["top", "mid"],
          modules: undefined,
          perms: undefined,
          children: [
            {
              title: "말단",
              codeChain: ["top", "mid", "leaf"],
              modules: undefined,
              perms: ["use", "edit"],
              children: undefined,
            },
          ],
        },
      ],
    },
  ]);
  value = signal<Record<string, boolean>>({});
}

@Component({
  selector: "sd-permission-table-disabled-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdPermissionTable],
})
export class SdPermissionTableDisabledTest {
  items = signal<SdPermission[]>([
    {
      title: "모듈A",
      codeChain: ["moduleA"],
      modules: undefined,
      perms: ["use", "edit"],
      children: undefined,
    },
  ]);
  value = signal<Record<string, boolean>>({});
}

@Component({
  selector: "sd-permission-table-disabled-two-level-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdPermissionTable],
})
export class SdPermissionTableDisabledTwoLevelTest {
  items = signal<SdPermission[]>([
    {
      title: "모듈A",
      codeChain: ["moduleA"],
      modules: undefined,
      perms: undefined,
      children: [
        {
          title: "기능1",
          codeChain: ["moduleA", "func1"],
          modules: undefined,
          perms: ["use", "edit"],
          children: undefined,
        },
        {
          title: "기능2",
          codeChain: ["moduleA", "func2"],
          modules: undefined,
          perms: ["use"],
          children: undefined,
        },
      ],
    },
  ]);
  value = signal<Record<string, boolean>>({});
}

@Component({
  selector: "sd-permission-table-disabled-mixed-node-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdPermissionTable],
})
export class SdPermissionTableDisabledMixedNodeTest {
  items = signal<SdPermission[]>([
    {
      title: "모듈A",
      codeChain: ["moduleA"],
      modules: undefined,
      perms: ["use", "edit"],
      children: [
        {
          title: "기능1",
          codeChain: ["moduleA", "func1"],
          modules: undefined,
          perms: ["use", "edit"],
          children: undefined,
        },
      ],
    },
  ]);
  value = signal<Record<string, boolean>>({});
}
