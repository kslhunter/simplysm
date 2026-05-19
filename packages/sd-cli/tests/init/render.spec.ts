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

describe("client/src/AppPage.ts.hbs", () => {
  it("라우팅 Y → router-outlet", async () => {
    const data = buildData({
      workspaceName: "demo",
      description: "Demo",
      hasServer: false,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
    });
    const ctx = { ...data, client: data.clients[0] };
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/AppPage.ts.hbs"), ctx);
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
    const out = await renderTemplate(path.join(TPL_ROOT, "client/src/AppPage.ts.hbs"), ctx);
    expect(out).not.toContain("router-outlet");
    expect(out).toContain("<div></div>");
  });
});

describe("client-common/src/providers/AppOrmProvider.ts.hbs", () => {
  it("workspaceNameUpper 가 database 명에 들어감", async () => {
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
      path.join(TPL_ROOT, "client-common/src/providers/AppOrmProvider.ts.hbs"),
      data,
    );
    expect(out).toContain('database: "DEMO2"');
    expect(out).toContain('from "@demo2/common"');
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
