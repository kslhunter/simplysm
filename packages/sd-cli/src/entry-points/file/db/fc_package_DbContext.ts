import { StringUtil } from "@simplysm/sd-core-common";

export const fc_package_DbContext = (opt: { name: string }): string => /* language=ts */ `

import { Type } from "@simplysm/sd-core-common";
import { IDbMigration, DbContext } from "@simplysm/sd-orm-common";

export class ${StringUtil.toPascalCase(opt.name)}DbContext extends DbContext {
  public get migrations(): Type<IDbMigration>[] {
    return [];
  }
}

`.trim();
