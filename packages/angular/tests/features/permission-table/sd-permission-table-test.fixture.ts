import { Component, signal } from "@angular/core";
import type { ISdPermission } from "../../../src/core/providers/sd-app-structure.provider";
import { SdPermissionTableControl } from "../../../src/features/permission-table/sd-permission-table.control";

@Component({
  selector: "sd-permission-table-empty-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" />`,
  standalone: true,
  imports: [SdPermissionTableControl],
})
export class SdPermissionTableEmptyTest {
  items = signal<ISdPermission[]>([]);
  value = signal<Record<string, boolean>>({});
}

@Component({
  selector: "sd-permission-table-two-level-test",
  template: `<sd-permission-table [items]="items()" [(value)]="value" />`,
  standalone: true,
  imports: [SdPermissionTableControl],
})
export class SdPermissionTableTwoLevelTest {
  items = signal<ISdPermission[]>([
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
  imports: [SdPermissionTableControl],
})
export class SdPermissionTableThreeLevelTest {
  items = signal<ISdPermission[]>([
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
  imports: [SdPermissionTableControl],
})
export class SdPermissionTableDisabledTest {
  items = signal<ISdPermission[]>([
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
