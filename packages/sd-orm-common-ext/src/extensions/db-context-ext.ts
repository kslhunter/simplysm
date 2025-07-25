import { DbContext, Queryable } from "@simplysm/sd-orm-common";
import { SystemDataLog } from "../models/system-data-log";
import { SystemLog } from "../models/system-log";
import { Authentication } from "../models/authentication";
import { User } from "../models/user";
import { UserConfig } from "../models/user-config";
import { UserPermission } from "../models/user-permission";
import { DateTime, JsonConvert, Uuid } from "@simplysm/sd-core-common";
import { UniqueCode } from "../models/unique-code";

export abstract class DbContextExt extends DbContext {
  uniqueCode = new Queryable(this, UniqueCode);
  systemDataLog = new Queryable(this, SystemDataLog);
  systemLog = new Queryable(this, SystemLog);
  authentication = new Queryable(this, Authentication);
  user = new Queryable(this, User);
  userConfig = new Queryable(this, UserConfig);
  userPermission = new Queryable(this, UserPermission);

  async authAsync(authKey: Uuid): Promise<IAuthInfo>;
  async authAsync(loginId: string, encryptedPassword: string): Promise<IAuthInfo>;
  async authAsync(arg1: string | Uuid, arg2?: string): Promise<IAuthInfo> {
    const authKey = arg1 instanceof Uuid ? arg1 : undefined;
    const loginId = typeof arg1 === "string" ? arg1 : undefined;
    const encryptedPassword = typeof arg1 === "string" ? arg2 : undefined;

    //-- 오래된 인증정보 삭제

    await this.authentication
      .where((item) => [this.qh.lessThen(item.lastDateTime, new DateTime().addDays(-1))])
      .deleteAsync();

    //-- 사용자.ID 가져오기

    const dbUser =
      authKey != null
        ? await this.authentication
            .include((item) => item.user.permissions)
            .include((item) => item.user.configs)
            .where((item) => [this.qh.equal(item.key, authKey)])
            .select((item) => ({
              id: item.user.id.notNull(),
              name: item.user.name,
              email: item.user.email,
              permissions: item.user.permissions.map((item1) => ({
                code: item1.code,
                valueJson: item1.valueJson,
              })),
              configs: item.user.configs.map((item1) => ({
                code: item1.code,
                valueJson: item1.valueJson,
              })),
            }))
            .singleAsync()
        : await this.user
            .where((item) => [
              this.qh.equal(item.loginId, loginId),
              this.qh.equal(item.encryptedPassword, encryptedPassword),
              this.qh.isFalse(item.isDeleted),
            ])
            .include((item) => item.permissions)
            .include((item) => item.configs)
            .select((item) => ({
              id: item.id.notNull(),
              name: item.name,
              email: item.email,
              permissions: item.permissions.map((item1) => ({
                code: item1.code,
                valueJson: item1.valueJson,
              })),
              configs: item.configs.map((item1) => ({
                code: item1.code,
                valueJson: item1.valueJson,
              })),
            }))
            .singleAsync();

    if (dbUser == null) {
      if (authKey != null) {
        throw new Error("인증정보가 만료되었습니다.\n다시 로그인하세요.");
      } else {
        throw new Error("직원 정보를 찾을 수 없습니다.\n아이디/비밀번호를 확인하세요.");
      }
    }

    //-- 인증갱신
    const upsertAuthKey = (
      await this.authentication
        .where((item) => [this.qh.equal(item.userId, dbUser.id)])
        .upsertAsync(
          () => ({
            lastDateTime: new DateTime(),
          }),
          (updateRecord) => ({
            ...updateRecord,
            key: Uuid.new(),
            userId: dbUser.id,
          }),
          ["key"],
        )
    ).single()!.key;

    //-- 반환

    return {
      key: upsertAuthKey,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        permissionRecord: dbUser.permissions.toObject(
          (item) => item.code,
          (item) => JsonConvert.parse(item.valueJson),
        ),
        configRecord: dbUser.configs.toObject(
          (item) => item.code,
          (item) => JsonConvert.parse(item.valueJson),
        ),
      },
    };
  }

  async setUserConfig(userId: number, key: string, val: any) {
    const db = this;
    await db.userConfig
      .where((item) => [db.qh.equal(item.userId, userId), db.qh.equal(item.code, key)])
      .upsertAsync(
        () => ({
          valueJson: JsonConvert.stringify(val),
        }),
        (updateRecord) => ({
          ...updateRecord,
          userId: userId,
          code: key,
        }),
      );
  }

  async getUserConfig(userId: number, key: string) {
    const db = this;
    const userConfig = await db.userConfig
      .where((item) => [db.qh.equal(item.userId, userId), db.qh.equal(item.code, key)])
      .singleAsync();
    return userConfig?.valueJson !== undefined ? JsonConvert.parse(userConfig.valueJson) : undefined;
  }

  async writeSystemLog(
    userId: number | undefined,
    clientName: string,
    severity: "error" | "warn" | "log",
    ...logs: any[]
  ) {
    const db = this;
    await db.systemLog.insertAsync(
      logs.map((log) => ({
        clientName: clientName,
        dateTime: new DateTime(),
        type: severity,
        jsonData: JsonConvert.stringify(log),
        userId: userId,
      })),
    );
  }

  async createUniqueCodes(option: { prefix: string; seqLength: number; count: number }): Promise<string[]> {
    const db = this;

    const lastSeq =
      (
        await db.uniqueCode
          .where((item) => [db.qh.startsWith(item.code, option.prefix)])
          .select((item) => ({
            seq: db.qh.max(item.seq),
          }))
          .lock()
          .singleAsync()
      )?.seq ?? 0;

    const newSeq = lastSeq + 1;

    const items: UniqueCode[] = [];
    for (let i = 0; i < option.count; i++) {
      const seq = newSeq + i;
      const code = option.prefix + seq.toString().padStart(option.seqLength, "0");
      items.push({ seq, code });
    }

    await db.uniqueCode.insertAsync(items);

    return items.map((item) => item.code);
  }
}

export interface IAuthInfo<T extends Record<string, any> = Record<string, any>> {
  key: Uuid;
  user: {
    id: number;
    name: string;
    email: string | undefined;
    permissionRecord: Record<string, any>;
    configRecord: T;
  };
}
