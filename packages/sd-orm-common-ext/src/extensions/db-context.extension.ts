import { DbContext, Queryable } from "@simplysm/sd-orm-common";
import { SystemDataLog } from "../models/system-data-log";
import { SystemErrorLog } from "../models/system-error-log";
import { Authentication } from "../models/authentication";
import { User } from "../models/user";
import { UserConfig } from "../models/user-config";
import { UserPermission } from "../models/user-permission";

declare module "@simplysm/sd-orm-common" {
  interface DbContext {
    systemDataLog: Queryable<this, SystemDataLog>;
    systemErrorLog: Queryable<this, SystemErrorLog>;
    authentication: Queryable<this, Authentication>;
    user: Queryable<this, User>;
    userConfig: Queryable<this, UserConfig>;
    userPermission: Queryable<this, UserPermission>;
  }
}

((prototype) => {
  prototype.systemDataLog = new Queryable(prototype, SystemDataLog);
  prototype.systemErrorLog = new Queryable(prototype, SystemErrorLog);
  prototype.authentication = new Queryable(prototype, Authentication);
  prototype.user = new Queryable(prototype, User);
  prototype.userConfig = new Queryable(prototype, UserConfig);
  prototype.userPermission = new Queryable(prototype, UserPermission);
})(DbContext.prototype);


/*export abstract class DbContextExt extends DbContext {
  systemDataLog = new Queryable(this, SystemDataLog);
  systemErrorLog = new Queryable(this, SystemErrorLog);
  authentication = new Queryable(this, Authentication);
  user = new Queryable(this, User);
  userConfig = new Queryable(this, UserConfig);
  userPermission = new Queryable(this, UserPermission);
}*/