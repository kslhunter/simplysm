import { describe, expect, it } from "vitest";
import { normalize } from "../../src/commands/init/normalize";
import type { InitInput } from "../../src/commands/init/types";

const base: InitInput = {
  workspaceName: "demo",
  description: "Demo",
  hasServer: false,
  clients: [],
  hasDb: false,
};

describe("normalize", () => {
  it("client- prefix 없는 이름에 자동 prefix", () => {
    const r = normalize({
      ...base,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
    });
    expect(r.clients[0].name).toBe("client-admin");
  });

  it("client- prefix 이미 있는 이름은 보존", () => {
    const r = normalize({
      ...base,
      clients: [{ name: "client-admin", type: "web", hasRouter: true }],
    });
    expect(r.clients[0].name).toBe("client-admin");
  });

  it("server=Y → hasCommon=true", () => {
    const r = normalize({ ...base, hasServer: true, serverPort: 40080 });
    expect(r.hasCommon).toBe(true);
  });

  it("server=N → hasCommon=false", () => {
    expect(normalize(base).hasCommon).toBe(false);
  });

  it("hasClientCommon: server=Y 또는 client>=2", () => {
    expect(normalize({ ...base, hasServer: true }).hasClientCommon).toBe(true);
    expect(
      normalize({
        ...base,
        clients: [
          { name: "a", type: "web", hasRouter: true },
          { name: "b", type: "web", hasRouter: true },
        ],
      }).hasClientCommon,
    ).toBe(true);
    expect(
      normalize({
        ...base,
        clients: [{ name: "a", type: "web", hasRouter: true }],
      }).hasClientCommon,
    ).toBe(false);
  });

  it("mobile client → hasRouter 자동 false, isMobile=true, hasMobile=true", () => {
    const r = normalize({
      ...base,
      clients: [{ name: "pda", type: "mobile", hasRouter: true }],
    });
    expect(r.clients[0].hasRouter).toBe(false);
    expect(r.clients[0].isMobile).toBe(true);
    expect(r.hasMobile).toBe(true);
  });

  it("workspaceNameUpper: 대문자 + 하이픈→언더스코어", () => {
    expect(normalize({ ...base, workspaceName: "my-cool-app" }).workspaceNameUpper).toBe(
      "MY_COOL_APP",
    );
  });

  it("DB dialect 별 dbPort 자동 도출", () => {
    expect(
      normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql" }).dbPort,
    ).toBe(3306);
    expect(
      normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "postgresql" }).dbPort,
    ).toBe(5432);
    expect(
      normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mssql" }).dbPort,
    ).toBe(1433);
  });

  it("dbDialect 별 boolean 플래그", () => {
    const m = normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql" });
    expect(m.isMysql).toBe(true);
    expect(m.isPostgres).toBe(false);
    expect(m.isMssql).toBe(false);
  });

  it("server=N 인데 DB=Y 입력 시 hasDb 강제 false", () => {
    const r = normalize({ ...base, hasServer: false, hasDb: true, dbDialect: "mysql" });
    expect(r.hasDb).toBe(false);
    expect(r.dbDialect).toBeUndefined();
  });

  it("mobile client 0개면 mobileAppId 무시", () => {
    const r = normalize({ ...base, mobileAppId: "kr.co.x.y" });
    expect(r.mobileAppId).toBeUndefined();
  });

  it("firstMobileClientName 도출", () => {
    const r = normalize({
      ...base,
      clients: [
        { name: "admin", type: "web", hasRouter: true },
        { name: "pda", type: "mobile", hasRouter: false },
      ],
    });
    expect(r.firstMobileClientName).toBe("client-pda");
  });

  it("DB=Y default → MainDbContext", () => {
    const r = normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql" });
    expect(r.dbContextClassName).toBe("MainDbContext");
  });

  it("DB=Y dbContextName 자유 입력 → PascalCase + DbContext suffix", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "order",
    });
    expect(r.dbContextClassName).toBe("OrderDbContext");
  });

  it("DB=Y dbContextName 에 DbContext suffix 이미 포함 시 중복 제거", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "MainDbContext",
    });
    expect(r.dbContextClassName).toBe("MainDbContext");
  });

  it("DB=N 시 dbContextClassName 은 빈 문자열", () => {
    expect(normalize(base).dbContextClassName).toBe("");
  });

  it("DB=Y default → dbContextFileName=main.db-context", () => {
    const r = normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql" });
    expect(r.dbContextFileName).toBe("main.db-context");
  });

  it("DB=Y dbContextName=userOrder → dbContextFileName=user-order.db-context", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "userOrder",
    });
    expect(r.dbContextFileName).toBe("user-order.db-context");
  });

  it("DB=N 시 dbContextFileName 은 빈 문자열", () => {
    expect(normalize(base).dbContextFileName).toBe("");
  });

  it("DB=Y default → dbContextNameUpper=MAIN", () => {
    const r = normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql" });
    expect(r.dbContextNameUpper).toBe("MAIN");
  });

  it("DB=Y dbContextName=order → dbContextNameUpper=ORDER", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "order",
    });
    expect(r.dbContextNameUpper).toBe("ORDER");
  });

  it("DB=Y dbContextName=MainDbContext → dbContextNameUpper=MAIN (suffix 제거 후)", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "MainDbContext",
    });
    expect(r.dbContextNameUpper).toBe("MAIN");
  });

  it("DB=Y default → dbFolderName=db-main", () => {
    const r = normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql" });
    expect(r.dbFolderName).toBe("db-main");
  });

  it("DB=Y dbContextName=userOrder → dbFolderName=db-user-order", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "userOrder",
    });
    expect(r.dbFolderName).toBe("db-user-order");
  });

  it("DB=N 시 dbFolderName 은 빈 문자열", () => {
    expect(normalize(base).dbFolderName).toBe("");
  });

  it("DB=N 이면 hasAuth=Y 입력해도 강제 false", () => {
    const r = normalize({ ...base, hasServer: true, hasDb: false, hasAuth: true });
    expect(r.hasAuth).toBe(false);
  });

  it("DB=Y + hasAuth 미입력 → hasAuth=false", () => {
    const r = normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql" });
    expect(r.hasAuth).toBe(false);
    expect(r.userEntityPascal).toBe("");
    expect(r.userEntityCamel).toBe("");
    expect(r.userEntityKebab).toBe("");
    expect(r.userEntityLabel).toBe("");
  });

  it("hasAuth=Y default → user/사용자 파생", () => {
    const r = normalize({ ...base, hasServer: true, hasDb: true, dbDialect: "mysql", hasAuth: true });
    expect(r.hasAuth).toBe(true);
    expect(r.userEntityPascal).toBe("User");
    expect(r.userEntityCamel).toBe("user");
    expect(r.userEntityKebab).toBe("user");
    expect(r.userEntityLabel).toBe("사용자");
  });

  it("hasAuth=Y + userEntityName=employee/직원 → Employee/employee 파생", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      userEntityName: "employee",
      userEntityLabel: "직원",
    });
    expect(r.userEntityPascal).toBe("Employee");
    expect(r.userEntityCamel).toBe("employee");
    expect(r.userEntityKebab).toBe("employee");
    expect(r.userEntityLabel).toBe("직원");
  });

  it("hasAuth=Y + 복합어 userEntityName=staff-member → StaffMember/staffMember 파생", () => {
    const r = normalize({
      ...base,
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      userEntityName: "staff-member",
      userEntityLabel: "직원",
    });
    expect(r.userEntityPascal).toBe("StaffMember");
    expect(r.userEntityCamel).toBe("staffMember");
    expect(r.userEntityKebab).toBe("staff-member");
  });
});
