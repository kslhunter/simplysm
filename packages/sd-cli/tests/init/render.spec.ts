import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalize } from "../../src/commands/init/normalize";
import { renderTemplate } from "../../src/commands/init/render";
import type { InitInput, RenderData } from "../../src/commands/init/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TPL_ROOT = path.resolve(__dirname, "../../src/commands/init/templates");

function buildData(input: InitInput): RenderData {
  return { ...normalize(input), jwtSecret: "test-jwt-secret" };
}

describe("sd.config.ts.hbs", () => {
  it("case-001: server+admin, DB=N", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo Workspace",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"),
      data,
    );
    expect(out).toMatchSnapshot();
  });

  it("mobile client 정의에 pwa:false 자동 포함", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      mobileAppId: "kr.co.demo.app",
      clients: [{ name: "pda", type: "mobile", hasRouter: false }],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"),
      data,
    );
    expect(out).toContain("pwa: false");
  });

  it("web client 정의에는 pwa 키 없음 (기본 활성)", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"),
      data,
    );
    expect(out).not.toContain("pwa: false");
  });

  it("case-002: server+admin+pda(mobile), DB=mysql", async () => {
    const data = buildData({
      workspaceName: "demo2",
      description: "Demo2 Workspace",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      mobileAppId: "kr.co.demo2.app",
      clients: [
        { name: "admin", type: "web", hasRouter: true },
        { name: "pda", type: "mobile", hasRouter: false },
      ],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"),
      data,
    );
    expect(out).toMatchSnapshot();
  });

  it("case-003: server=N, admin only", async () => {
    const data = buildData({
      workspaceName: "demo3",
      description: "Demo3 Workspace",
      hasServer: false,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"),
      data,
    );
    expect(out).toMatchSnapshot();
  });
});

describe("server/src/main.ts.hbs", () => {
  it("DB=N — OrmService 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/src/main.ts.hbs"), data);
    expect(out).toMatchSnapshot();
    expect(out).not.toContain("OrmService");
  });

  it("DB=Y — OrmService 포함", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/src/main.ts.hbs"), data);
    expect(out).toMatchSnapshot();
    expect(out).toContain("OrmService");
  });

  it("DB=Y 인증 OFF — AuthService 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/src/main.ts.hbs"), data);
    expect(out).toContain("OrmService,");
    expect(out).toContain('...(parseBoolEnv(env("DEV")) ? [DevService] : []),');
    expect(out).not.toContain("AuthService");
  });

  it("인증 ON — AuthService import + services 등록", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/src/main.ts.hbs"), data);
    expect(out).toContain('import { AuthService } from "./services/auth.service";');
    expect(out).toContain('import { DevService } from "./services/dev.service";');
    expect(out).toContain("OrmService,");
    expect(out).toContain("AuthService,");
    expect(out).toContain('...(parseBoolEnv(env("DEV")) ? [DevService] : []),');
  });
});

describe("server 인증 템플릿", () => {
  const authData = buildData({
    workspaceName: "demo",
    description: "Demo",
    hasServer: true,
    hasDb: true,
    dbDialect: "mysql",
    dbContextName: "main",
    hasAuth: true,
    userEntityName: "employee",
    userEntityLabel: "직원",
    clients: [],
    serverPort: 40080,
  });

  it("orm.utils: dbContextClassName + 설정키(Upper) + workspace common import 반영", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "server/src/utils/orm.utils.ts.hbs"),
      authData,
    );
    expect(out).toContain('import { MainDbContext } from "@demo/common";');
    expect(out).toContain("await ctx.getConfig<{ MAIN: DbConnConfig }>(\"orm\")");
    expect(out).toContain("return createOrm(MainDbContext, ormConfig.MAIN);");
  });

  it("auth.service: 사용자 엔티티 네이밍이 IAuthData/쿼리/메시지에 반영", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "server/src/services/auth.service.ts.hbs"),
      authData,
    );
    expect(out).toContain('import { AuthInfoChangedEvent, EmployeeConfig, RolePermission } from "@demo/common";');
    expect(out).toContain("export interface IEmployeeConfigMap {");
    expect(out).toContain("employeeId: number;");
    expect(out).toContain("name: string;");
    expect(out).toContain("roleName: string;");
    expect(out).toContain("configs: IEmployeeConfigMap;");
    expect(out).toContain(".employee()");
    expect(out).toContain("currentAuth.employeeId");
    expect(out).toContain("roleName: employee.role!.name,");
    expect(out).toContain(".include((item) => item.role)");
    expect(out).toContain(".from(EmployeeConfig)");
    expect(out).toContain("expr.eq(ec.employeeId, e.id)");
    expect(out).toContain("(configs as Record<string, unknown>)[c.code] = JSON.parse(c.valueJson);");
    expect(out).toContain("유효하지 않은 직원입니다.");

    // update(내정보수정) 메서드 + 인증정보 변경 이벤트 emit
    expect(out).toContain("update: auth(");
    expect(out).toContain("configs: IEmployeeConfigMap;");
    expect(out).toContain(".employeeConfig()");
    expect(out).toContain("expr.eq(c.employeeId, employeeId)");
    expect(out).toContain('action: "수정(내정보수정)",');
    expect(out).toContain("ctx.server.emitEvent(");
    expect(out).toContain("(info) => info.employeeId === employeeId,");
  });

  it("auth.service: 기본 네이밍(user/사용자) 반영", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "server/src/services/auth.service.ts.hbs"),
      data,
    );
    expect(out).toContain("userId: number;");
    expect(out).toContain(".user()");
    expect(out).toContain("유효하지 않은 사용자입니다.");
  });

  it("server/package.json: 인증 ON 시 bcrypt + @types/bcrypt 포함", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "server/package.json.hbs"), authData);
    expect(out).toContain('"bcrypt": "^6.0.0"');
    expect(out).toContain('"@types/bcrypt": "^6.0.0"');
  });

  it("server/package.json: 인증 OFF 시 bcrypt 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/package.json.hbs"), data);
    expect(out).not.toContain("bcrypt");
  });
});

describe("client/src/main.ts.hbs", () => {
  it("라우팅 Y (web)", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });
    const ctx = { ...data, client: data.clients[0] };
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/main.ts.hbs"), ctx);
    expect(out).toMatchSnapshot();
    expect(out).toContain("provideRouter");
  });

  it("라우팅 N (mobile)", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      mobileAppId: "kr.co.demo.app",
      clients: [{ name: "pda", type: "mobile", hasRouter: false }],
      serverPort: 40080,
    });
    const ctx = { ...data, client: data.clients[0] };
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/main.ts.hbs"), ctx);
    expect(out).toMatchSnapshot();
    expect(out).not.toContain("provideRouter");
  });
});

describe("client/src/app.root.ts.hbs", () => {
  it("라우팅 Y → router-outlet", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: false,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
    });
    const ctx = { ...data, client: data.clients[0] };
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/app.root.ts.hbs"), ctx);
    expect(out).toContain("router-outlet");
  });

  it("라우팅 N → div", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: false,
      hasDb: false,
      clients: [{ name: "x", type: "web", hasRouter: false }],
    });
    const ctx = { ...data, client: data.clients[0] };
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/app.root.ts.hbs"), ctx);
    expect(out).not.toContain("router-outlet");
    expect(out).toContain("<div></div>");
  });
});

describe("client 인증 로그인 (routes / login.view / ng-icons)", () => {
  function authClientCtx(hasAuth: boolean, hasRouter = true) {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth,
      clients: [{ name: "admin", type: "web", hasRouter }],
      serverPort: 40080,
    });
    return { ...data, client: data.clients[0] };
  }

  it("routes.ts: 인증 ON → /login 리다이렉트 + lazy LoginView", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/routes.ts.hbs"), authClientCtx(true));
    expect(out).toContain('{ path: "", redirectTo: "/login", pathMatch: "full" }');
    expect(out).toContain('import("./app/login/login.view").then((m) => m.LoginView)');
  });

  it("routes.ts: 인증 OFF → 빈 routes", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/routes.ts.hbs"), authClientCtx(false));
    expect(out).toContain("export const routes: Routes = [];");
    expect(out).not.toContain("login");
  });

  it("login.view: client-common import + Angular 보간 복원 + configs 시작경로", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client/src/app/login/login.view.ts.hbs"),
      authClientCtx(true),
    );
    expect(out).toContain('import { AppAuthProvider } from "@demo/client-common";');
    expect(out).toContain('alt="demo"');
    expect(out).toContain("v{{ VER }}.{{ DEV ? \"d\" : \"p\" }}");
    expect(out).toContain('this._appAuth.authInfo()?.configs["first-router-link"] ?? "/home/main"');
    expect(out).not.toContain("{{workspaceName}}");
  });

  it("client/package.json: 인증 ON + router → @ng-icons 포함", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/package.json.hbs"), authClientCtx(true));
    expect(out).toContain('"@ng-icons/core": "^33.2.3"');
    expect(out).toContain('"@ng-icons/tabler-icons": "^33.2.3"');
  });

  it("client/package.json: 인증 OFF + DB ON → dev 모달용 @ng-icons 포함", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/package.json.hbs"), authClientCtx(false));
    expect(out).toContain('"@ng-icons/core": "^33.2.3"');
  });

  it("client/package.json: 인증 OFF + DB OFF → @ng-icons 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "client/package.json.hbs"), {
      ...data,
      client: data.clients[0],
    });
    expect(out).not.toContain("@ng-icons");
  });
});

describe("관리자 셸 (home/main/app-structure/main.ts 와이어링)", () => {
  function authClientCtx(hasAuth: boolean, hasRouter = true, userEntityName = "employee", userEntityLabel = "직원") {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth,
      userEntityName: hasAuth ? userEntityName : undefined,
      userEntityLabel: hasAuth ? userEntityLabel : undefined,
      clients: [{ name: "admin", type: "web", hasRouter }],
      serverPort: 40080,
    });
    return { ...data, client: data.clients[0] };
  }

  it("common/app-structure: 사용자 엔티티 메뉴 항목에 선택 네이밍 반영", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/app-structure.ts.hbs"), authClientCtx(true));
    expect(out).toContain('import type { AppStructureItem } from "@simplysm/service-common";');
    expect(out).toContain("export const adminAppStructureItems: AppStructureItem[] = [");
    expect(out).toContain('{ code: "employee", title: "직원", perms: ["use", "edit"] }');
    expect(out).toContain('{ code: "role-permission", title: "역할/권한", perms: ["use", "edit"] }');
  });

  it("common/index: 인증 ON → app-structure re-export", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/index.ts.hbs"), authClientCtx(true));
    expect(out).toContain('export * from "./app-structure";');
  });

  it("common/index: 인증 OFF → app-structure 없음", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/index.ts.hbs"), authClientCtx(false));
    expect(out).not.toContain("app-structure");
  });

  it("common/package.json: 인증 ON → service-common 의존", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "common/package.json.hbs"), authClientCtx(true));
    expect(out).toContain('"@simplysm/service-common": "^14.0.0"');
  });

  it("common/package.json: 인증 OFF → service-common 없음", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "common/package.json.hbs"), authClientCtx(false));
    expect(out).not.toContain("service-common");
  });

  it("routes.ts: 인증 ON → home(+main children) 라우트 포함", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/routes.ts.hbs"), authClientCtx(true));
    expect(out).toContain('import("./app/home/home.view").then((m) => m.HomeView)');
    expect(out).toContain('import("./app/home/main/main.view").then((m) => m.MainView)');
    expect(out).toContain('{ path: "", redirectTo: "main", pathMatch: "full" }');
  });

  it("home.view: client-common import + Angular 보간 복원 + 사이드바", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/app/home/home.view.ts.hbs"), authClientCtx(true));
    expect(out).toContain('import { AppAuthProvider } from "@demo/client-common";');
    expect(out).toContain("export class HomeView {");
    expect(out).toContain("{{ authInfo()?.name }}");
    expect(out).toContain("{{ authInfo()?.roleName }}");
    expect(out).toContain("this._sdAppStructure.usableMenus()");
    expect(out).not.toContain("\\{{");
  });

  it("main.view: SdBaseContainer + viewType", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/app/home/main/main.view.ts.hbs"), authClientCtx(true));
    expect(out).toContain("export class MainView {");
    expect(out).toContain("viewType = injectViewTypeSignal();");
  });

  it("client/main.ts: 인증 ON + router → app-structure 초기화 와이어링", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/main.ts.hbs"), authClientCtx(true));
    expect(out).toContain("SdAppStructureProvider");
    expect(out).toContain('import { adminAppStructureItems } from "@demo/common";');
    expect(out).toContain("inject(SdAppStructureProvider).initialize(adminAppStructureItems);");
  });

  it("client/main.ts: 인증 OFF → app-structure 초기화 없음", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/main.ts.hbs"), authClientCtx(false));
    expect(out).not.toContain("SdAppStructureProvider");
    expect(out).not.toContain("appStructureItems");
  });
});

describe("client-common/src/providers/app-orm.provider.ts.hbs", () => {
  it("default dbContextName=main → MainDbContext + workspaceNameUpper database", async () => {
    const data = buildData({
      workspaceName: "demo2",
      description: "Demo2",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client-common/src/providers/app-orm.provider.ts.hbs"),
      data,
    );
    expect(out).toContain('database: "DEMO2"');
    expect(out).toContain('from "@demo2/common"');
    expect(out).toContain("import { MainDbContext }");
    expect(out).toContain("DbClass: MainDbContext");
    expect(out).toContain('configName: "MAIN"');
  });

  it("custom dbContextName=order → OrderDbContext 가 import·DbClass 에 반영", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "order",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client-common/src/providers/app-orm.provider.ts.hbs"),
      data,
    );
    expect(out).toContain("import { OrderDbContext }");
    expect(out).toContain("DbClass: OrderDbContext");
    expect(out).toContain('configName: "ORDER"');
  });
});

describe("client-common/src/providers/app-service.provider.ts.hbs", () => {
  const svcTpl = "client-common/src/providers/app-service.provider.ts.hbs";

  it("인증 OFF (DB만) → auth getter / AuthServiceMethods 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, svcTpl), data);
    expect(out).toContain("get orm()");
    expect(out).not.toContain("AuthServiceMethods");
    expect(out).not.toContain("get auth()");
  });

  it("인증 ON → AuthService 프록시 getter + server 타입 import", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, svcTpl), data);
    expect(out).toContain("AuthServiceMethods,");
    expect(out).toContain('} from "@demo/server";');
    expect(out).toContain("type ServiceProxy,");
    expect(out).toContain("private _auth?: ServiceProxy<AuthServiceMethods>;");
    expect(out).toContain("get auth(): ServiceProxy<AuthServiceMethods> {");
    expect(out).toContain(
      'this._auth ??= this.client.getService<AuthServiceMethods>("AuthService")',
    );
  });
});

describe("client-common/src/providers/app-auth.provider.ts.hbs", () => {
  it("인증 ON → IAuthData(server) import + auth 흐름 메서드 포함", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client-common/src/providers/app-auth.provider.ts.hbs"),
      data,
    );
    expect(out).toContain('import type { IAuthData } from "@demo/server";');
    expect(out).toContain("export class AppAuthProvider {");
    expect(out).toContain("authInfo = signal<IAuthData | undefined>(undefined);");
    expect(out).toContain("inject(SdAppStructureProvider)");
    expect(out).toContain("this._sdAppStructure.permRecord.set(authData.permissions);");
    expect(out).toContain("async login(loginId: string, password: string): Promise<void>");
    expect(out).toContain("async tryReloadAuth(): Promise<boolean>");
    expect(out).toContain("await this._appService.client.auth(token);");
  });
});

describe("client-common/src/index.ts.hbs auth export", () => {
  it("인증 ON → AppAuthProvider export", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "client-common/src/index.ts.hbs"), data);
    expect(out).toContain('export * from "./providers/app-auth.provider";');
  });

  it("인증 OFF → AppAuthProvider export 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "client-common/src/index.ts.hbs"), data);
    expect(out).not.toContain("AppAuthProvider");
  });
});

describe("server/src/index.ts.hbs", () => {
  it("인증 ON → auth service 타입 re-export", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/src/index.ts.hbs"), data);
    expect(out).toContain('export type * from "./services/auth.service";');
  });
});

describe("client-common/package.json.hbs server 의존", () => {
  it("인증 ON → @workspace/server workspace 의존 추가", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "client-common/package.json.hbs"), data);
    expect(out).toContain('"@demo/server": "workspace:*"');
  });

  it("DB OFF → @workspace/server 의존 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "client-common/package.json.hbs"), data);
    expect(out).not.toContain("/server");
  });

  it("DB ON 인증 OFF → dev 서비스용 server 의존 유지", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "client-common/package.json.hbs"), data);
    expect(out).toContain('"@demo/server": "workspace:*"');
  });
});

describe("sd.config.ts.hbs orm config 키", () => {
  it("DB=Y default → MAIN", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"),
      data,
    );
    expect(out).toContain("MAIN: {");
  });

  it("DB=Y dbContextName=order → ORDER", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "order",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"),
      data,
    );
    expect(out).toContain("ORDER: {");
    expect(out).not.toContain("MAIN: {");
  });
});

describe("common/src/db/db-context.ts.hbs", () => {
  const dbContextTpl = "common/src/db/db-context.ts.hbs";

  it("dbContextClassName 자리에 클래스명 들어감", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "main",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, dbContextTpl), data);
    expect(out).toContain("export class MainDbContext extends DbContext");
  });

  it("인증 ON → 사용자/역할/권한 queryable 등록 (선택 네이밍 반영)", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      userEntityName: "employee",
      userEntityLabel: "직원",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, dbContextTpl), data);
    expect(out).toContain("employee = this.queryable(Employee);");
    expect(out).toContain("employeeConfig = this.queryable(EmployeeConfig);");
    expect(out).toContain("role = this.queryable(Role);");
    expect(out).toContain("rolePermission = this.queryable(RolePermission);");
    expect(out).toContain("dataLog = this.queryable(SystemDataLog);");
    expect(out).toContain("systemLog = this.queryable(SystemLog);");
  });

  it("인증 OFF → 로그 queryable 만, 사용자/역할 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, dbContextTpl), data);
    expect(out).toContain("dataLog = this.queryable(SystemDataLog);");
    expect(out).toContain("systemLog = this.queryable(SystemLog);");
    expect(out).not.toContain("queryable(Role)");
    expect(out).not.toContain("Config = this.queryable");
  });
});

describe("common/src/db/tables", () => {
  const authData = buildData({
    workspaceName: "demo",
    description: "Demo",
    hasServer: true,
    hasDb: true,
    dbDialect: "mysql",
    hasAuth: true,
    userEntityName: "employee",
    userEntityLabel: "직원",
    clients: [],
    serverPort: 40080,
  });

  it("master 사용자 테이블: Pascal 테이블명 + 한글 라벨 + config 역참조 (camel 관계명)", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "common/src/db/tables/master/user.ts.hbs"),
      authData,
    );
    expect(out).toContain('export const Employee = Table("Employee")');
    expect(out).toContain('.description("직원")');
    expect(out).toContain("configs: r.foreignKeyTarget(() => EmployeeConfig, \"employee\")");
  });

  it("master 사용자-config 테이블: {camel}Id FK", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "common/src/db/tables/master/user-config.ts.hbs"),
      authData,
    );
    expect(out).toContain('export const EmployeeConfig = Table("EmployeeConfig")');
    expect(out).toContain("employeeId: c.bigint(),");
    expect(out).toContain('employee: r.foreignKey(["employeeId"], () => Employee)');
  });

  it("system-data-log 인증 ON → {camel}Id FK 포함", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "common/src/db/tables/system/system-data-log.ts.hbs"),
      authData,
    );
    expect(out).toContain("employeeId: c.bigint().nullable(),");
    expect(out).toContain('employee: r.foreignKey(["employeeId"], () => Employee)');
  });

  it("system-data-log 인증 OFF → employee 컬럼/관계 없음, 문장 종료 정상", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "common/src/db/tables/system/system-data-log.ts.hbs"),
      data,
    );
    expect(out).not.toContain("employeeId");
    expect(out).not.toContain(".relations(");
    expect(out).not.toContain("master/");
    expect(out.trimEnd().endsWith("]);")).toBe(true);
  });
});

describe("common/src/db/system-data-log.ext.ts.hbs", () => {
  it("인증 ON → {camel}Id/{camel}Name 조인 select 포함", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      userEntityName: "employee",
      userEntityLabel: "직원",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "common/src/db/system-data-log.ext.ts.hbs"),
      data,
    );
    expect(out).toContain("employeeId?: number;");
    expect(out).toContain("employeeName?: string;");
    expect(out).toContain(".include((dl) => dl.employee)");
    expect(out).toContain("employeeName: dl.employee!.name,");
  });

  it("인증 OFF → employee 조인 없음 (action/dateTime 만)", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "common/src/db/system-data-log.ext.ts.hbs"),
      data,
    );
    expect(out).not.toContain("employee");
    expect(out).not.toContain(".include(");
  });
});

describe("common/src/index.ts.hbs", () => {
  it("DB=Y 인증 ON → db폴더 경로 + 사용자/역할 re-export", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      userEntityName: "employee",
      userEntityLabel: "직원",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/index.ts.hbs"), data);
    expect(out).toContain('export * from "./db-main/main.db-context"');
    expect(out).toContain('export * from "./db-main/tables/master/employee"');
    expect(out).toContain('export * from "./db-main/tables/master/employee-config"');
    expect(out).toContain('export * from "./db-main/tables/system/role"');
    expect(out).toContain('export * from "./db-main/system-data-log.ext"');
  });

  it("DB=Y 인증 OFF → 로그 테이블만 re-export, 사용자/역할 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/index.ts.hbs"), data);
    expect(out).toContain('export * from "./db-main/main.db-context"');
    expect(out).toContain('export * from "./db-main/tables/system/system-data-log"');
    expect(out).not.toContain("master/");
    expect(out).not.toContain("tables/system/role");
  });

  it("DB=N → 빈 export", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/index.ts.hbs"), data);
    expect(out).toContain("export {}");
    expect(out).not.toContain("DbContext");
  });
});

describe("SSG 클라이언트 스캐폴드", () => {
  function ssgCtx(useSsg: boolean) {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "portal", type: "web", hasRouter: true, useSsg }],
      serverPort: 40080,
    });
    return { ...data, client: data.clients[0] };
  }

  it("sd.config: SSG ON → prerender 설정 포함", async () => {
    const ctx = ssgCtx(true);
    const out = await renderTemplate(path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"), ctx);
    expect(out).toContain('prerender: ["/"],');
  });

  it("sd.config: SSG OFF → prerender 없음", async () => {
    const ctx = ssgCtx(false);
    const out = await renderTemplate(path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"), ctx);
    expect(out).not.toContain("prerender");
  });

  it("client/package.json: SSG ON → @angular/platform-server 의존성 포함", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/package.json.hbs"), ssgCtx(true));
    expect(out).toContain('"@angular/platform-server": "^21.2.0"');
  });

  it("client/package.json: SSG OFF → @angular/platform-server 없음", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/package.json.hbs"), ssgCtx(false));
    expect(out).not.toContain("@angular/platform-server");
  });

  it("client/main.ts: SSG ON → path 라우팅 + hydration", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/main.ts.hbs"), ssgCtx(true));
    expect(out).toContain('import { provideRouter } from "@angular/router";');
    expect(out).not.toContain("withHashLocation");
    expect(out).toContain("provideClientHydration");
    expect(out).toContain("provideRouter(routes),");
  });

  it("client/main.ts: SSG OFF → hash 라우팅 유지 + hydration 없음", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/main.ts.hbs"), ssgCtx(false));
    expect(out).toContain("provideRouter(routes, withHashLocation()),");
    expect(out).not.toContain("provideClientHydration");
  });

  it("client/public/robots.txt: SSG ON → 전체 허용", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client/public/robots.txt.hbs"),
      ssgCtx(true),
    );
    expect(out).toContain("User-agent: *");
    expect(out).toContain("Allow: /");
    expect(out).not.toContain("Disallow: /");
  });

  it("client/public/robots.txt: SSG OFF → 전체 차단", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client/public/robots.txt.hbs"),
      ssgCtx(false),
    );
    expect(out).toContain("User-agent: *");
    expect(out).toContain("Disallow: /");
  });

  it("client/main.server.ts: 서버 부트스트랩 default export + 최소 provider", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/main.server.ts.hbs"), ssgCtx(true));
    expect(out).toContain('import { provideServerRendering } from "@angular/platform-server";');
    expect(out).toContain("const bootstrap = (context: BootstrapContext) =>");
    expect(out).toContain("provideRouter(routes),");
    expect(out).toContain('provideSdAngular({ clientName: "client-portal" }),');
    expect(out).toContain("provideServerRendering(),");
    expect(out).toContain("export default bootstrap;");
    // 프리렌더는 빌드 시점 — 서버 연결·로그 배선 제외
    expect(out).not.toContain("connectAsync");
  });
});

describe("root/package.json.hbs", () => {
  it("hasMobile=true 시 run-device 스크립트 포함", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      mobileAppId: "kr.co.demo.app",
      clients: [{ name: "pda", type: "mobile", hasRouter: false }],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/package.json.hbs"),
      data,
    );
    expect(out).toContain("run-device");
    expect(out).toContain("client-pda");
  });

  it("hasMobile=false 시 run-device 스크립트 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "workspace-root/package.json.hbs"),
      data,
    );
    expect(out).not.toContain("run-device");
  });
});

describe("common/src/auth-info-changed.event.ts.hbs", () => {
  it("인증 ON → AuthInfoChangedEvent 정의 (선택 네이밍 반영)", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      userEntityName: "employee",
      userEntityLabel: "직원",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "common/src/auth-info-changed.event.ts.hbs"),
      data,
    );
    expect(out).toContain('import { defineEvent } from "@simplysm/service-common";');
    expect(out).toContain(
      "export const AuthInfoChangedEvent = defineEvent<{ employeeId: number; roleId: number }, void>(",
    );
    expect(out).toContain('"AuthInfoChanged",');
  });
});

describe("common/src/index.ts.hbs auth-info-changed export", () => {
  it("인증 ON → auth-info-changed.event re-export", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/index.ts.hbs"), data);
    expect(out).toContain('export * from "./auth-info-changed.event";');
  });

  it("인증 OFF → auth-info-changed.event 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "common/src/index.ts.hbs"), data);
    expect(out).not.toContain("auth-info-changed");
  });
});

describe("client-common 인증정보 변경 구독 배선", () => {
  const data = buildData({
    workspaceName: "demo",
    description: "Demo",
    hasServer: true,
    hasDb: true,
    dbDialect: "mysql",
    hasAuth: true,
    userEntityName: "employee",
    userEntityLabel: "직원",
    clients: [],
    serverPort: 40080,
  });

  it("app-service: authInfoChangedEvent getter + ClientEventProxy/이벤트 import", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client-common/src/providers/app-service.provider.ts.hbs"),
      data,
    );
    expect(out).toContain("type ClientEventProxy,");
    expect(out).toContain('import { AuthInfoChangedEvent } from "@demo/common";');
    expect(out).toContain(
      "get authInfoChangedEvent(): ClientEventProxy<typeof AuthInfoChangedEvent> {",
    );
    expect(out).toContain(
      "this._authInfoChangedEvent ??= this.client.getEvent(AuthInfoChangedEvent)",
    );
  });

  it("app-auth: 이벤트 구독 등록/해제 + 비동기 logout", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client-common/src/providers/app-auth.provider.ts.hbs"),
      data,
    );
    expect(out).toContain("async logout(): Promise<void> {");
    expect(out).toContain("await this._unregisterAuthEvent();");
    expect(out).toContain("await this._registerAuthEvent(authData.employeeId, authData.roleId);");
    expect(out).toContain(
      "private async _registerAuthEvent(employeeId: number, roleId: number): Promise<void> {",
    );
    expect(out).toContain("this._appService.authInfoChangedEvent.addListener(");
  });
});

describe("client/src/app/home/my-info/my-info.detail.ts.hbs", () => {
  const data = buildData({
    workspaceName: "demo",
    description: "Demo",
    hasServer: true,
    hasDb: true,
    dbDialect: "mysql",
    hasAuth: true,
    userEntityName: "employee",
    userEntityLabel: "직원",
    clients: [{ name: "admin", type: "web", hasRouter: true }],
    serverPort: 40080,
  });
  const ctx = { ...data, client: data.clients[0] };

  it("내정보수정 화면: 네이밍 반영 + Angular 보간 복원 + update 호출", async () => {
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client/src/app/home/my-info/my-info.detail.ts.hbs"),
      ctx,
    );
    expect(out).toContain("export class MyInfoDetail {");
    expect(out).toContain(
      'import { AppAuthProvider, AppOrmProvider, AppServiceProvider } from "@demo/client-common";',
    );
    expect(out).toContain('import { EmployeeConfig } from "@demo/common";');
    expect(out).toContain('import type { IEmployeeConfigMap } from "@demo/server";');
    expect(out).toContain(".employee()");
    expect(out).toContain(".from(EmployeeConfig)");
    expect(out).toContain("this._appAuth.authInfo()?.employeeId");
    expect(out).toContain("lastModifiedBy: item.lastDataLog?.employeeName,");
    expect(out).toContain("await this._appService.auth.update({");
    expect(out).toContain('{{ flatMenu.titleChain.join("» ") }}');
    expect(out).not.toContain("\\{{");
  });
});

describe("client/src/routes.ts.hbs my-info 라우트", () => {
  it("인증 ON → my-info lazy 라우트 포함", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });
    const ctx = { ...data, client: data.clients[0] };
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/routes.ts.hbs"), ctx);
    expect(out).toContain(
      'import("./app/home/my-info/my-info.detail").then((m) => m.MyInfoDetail)',
    );
  });
});

describe("server/src/services/dev.service.ts.hbs", () => {
  it("인증 ON → 엑셀 시드(역할/직원/역할권한) + 사용자 네이밍 반영", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      userEntityName: "employee",
      userEntityLabel: "직원",
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "server/src/services/dev.service.ts.hbs"),
      data,
    );
    expect(out).toContain('export const DevService = defineService("DevService"');
    expect(out).toContain("await db.initialize({ force: true });");
    expect(out).toContain('import { ExcelWorkbook } from "@simplysm/excel";');
    expect(out).toContain('import { appStructureItems } from "@demo/common";');
    expect(out).toContain(".employee().insert(");
    expect(out).toContain("getFlatPermissions(");
    expect(out).toContain("appStructureItems,");
  });

  it("인증 OFF (DB만) → 시드 없이 db.initialize + TODO", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "server/src/services/dev.service.ts.hbs"),
      data,
    );
    expect(out).toContain("await db.initialize({ force: true });");
    expect(out).toContain("// TODO: 초기 데이터 시드 추가");
    expect(out).not.toContain("ExcelWorkbook");
    expect(out).not.toContain("bcrypt");
    expect(out).not.toContain(".insert(");
  });
});

describe("server/src/index.ts.hbs dev export", () => {
  it("DB ON 인증 OFF → DevServiceMethods 만 export", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/src/index.ts.hbs"), data);
    expect(out).toContain('export type * from "./services/dev.service";');
    expect(out).not.toContain("auth.service");
  });

  it("인증 ON → auth + dev export", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(path.join(TPL_ROOT, "server/src/index.ts.hbs"), data);
    expect(out).toContain('export type * from "./services/auth.service";');
    expect(out).toContain('export type * from "./services/dev.service";');
  });
});

describe("client-common app-service dev getter", () => {
  it("DB ON → dev getter + DevServiceMethods import", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client-common/src/providers/app-service.provider.ts.hbs"),
      data,
    );
    expect(out).toContain("DevServiceMethods,");
    expect(out).toContain('} from "@demo/server";');
    expect(out).toContain("type ServiceProxy,");
    expect(out).toContain("get dev(): ServiceProxy<DevServiceMethods> {");
    expect(out).toContain('this._dev ??= this.client.getService<DevServiceMethods>("DevService")');
  });

  it("DB OFF → dev getter 없음", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: false,
      clients: [],
      serverPort: 40080,
    });
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client-common/src/providers/app-service.provider.ts.hbs"),
      data,
    );
    expect(out).not.toContain("DevServiceMethods");
    expect(out).not.toContain("get dev()");
  });
});

describe("client/src/app.root.ts.hbs dev 도구 배선", () => {
  function devCtx(hasDb: boolean, hasRouter = true) {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: hasDb,
      hasDb,
      dbDialect: "mysql",
      clients: [{ name: "admin", type: "web", hasRouter }],
      serverPort: 40080,
    });
    return { ...data, client: data.clients[0] };
  }

  it("DB ON → HostListener keydown + DevModal 호출", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/app.root.ts.hbs"), devCtx(true));
    expect(out).toContain('"(document:keydown)": "onKeydown($event)",');
    expect(out).toContain('import { DevModal } from "./modals/dev.modal";');
    expect(out).toContain("this._sdModal.showAsync({ type: DevModal");
    expect(out).toContain("export class AppRoot {");
  });

  it("DB OFF → 빈 AppRoot (dev 배선 없음)", async () => {
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/app.root.ts.hbs"), devCtx(false));
    expect(out).toContain("export class AppRoot {}");
    expect(out).not.toContain("onKeydown");
    expect(out).not.toContain("DevModal");
  });
});

describe("client/src/modals/dev.modal.ts.hbs", () => {
  it("dev 모달: client-common import + initDb 호출 + 아이콘 사용", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      hasAuth: true,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });
    const ctx = { ...data, client: data.clients[0] };
    const out = await renderTemplate(
      path.join(TPL_ROOT, "client/src/modals/dev.modal.ts.hbs"),
      ctx,
    );
    expect(out).toContain("export class DevModal implements SdModalContentDef<void> {");
    expect(out).toContain('import { AppServiceProvider } from "@demo/client-common";');
    expect(out).toContain("await this._appService.dev.initDb();");
    expect(out).toContain('import { NgIcon } from "@ng-icons/core";');
  });
});
