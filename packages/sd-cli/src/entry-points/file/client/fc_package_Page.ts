import { StringUtil } from "@simplysm/sd-core-common";

export const fc_package_Page = (opt: { name: string; isRouteParent: boolean }): string => /* language=ts */ `
  
import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-${StringUtil.toKebabCase(opt.name)}",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    ${opt.name}${opt.isRouteParent ? `<br/>
    <router-outlet></router-outlet>
    ` : ``}
  \`
})
export class ${opt.name}Page {
}

`.trim();
