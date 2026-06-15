import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { normalize } from "../../src/commands/init/normalize";
import { recoverWorkspace } from "../../src/commands/init/recover";
import { renderTemplate } from "../../src/commands/init/render";
import type { InitInput, RenderData } from "../../src/commands/init/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TPL_ROOT = path.resolve(__dirname, "../../src/commands/init/templates");

function buildData(input: InitInput): RenderData {
  return { ...normalize(input), jwtSecret: "test-jwt-secret" };
}

const tmpDirs: string[] = [];

async function createTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sd-init-recover-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

/** init 템플릿 렌더로 recover 가 읽는 파일들만 기존 워크스페이스 형태로 구성 */
async function buildWorkspace(input: InitInput): Promise<string> {
  const cwd = await createTmpDir();
  const data = buildData(input);

  await fs.writeFile(
    path.join(cwd, "package.json"),
    await renderTemplate(path.join(TPL_ROOT, "workspace-root/package.json.hbs"), data),
  );
  await fs.writeFile(
    path.join(cwd, "sd.config.ts"),
    await renderTemplate(path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs"), data),
  );

  if (data.hasAuth) {
    const commonSrc = path.join(cwd, "packages/common/src");
    await fs.mkdir(commonSrc, { recursive: true });
    await fs.writeFile(
      path.join(commonSrc, "app-structure.ts"),
      await renderTemplate(path.join(TPL_ROOT, "common/src/app-structure.ts.hbs"), data),
    );
  }

  if (data.hasDb) {
    const masterDir = path.join(cwd, "packages/common/src", data.dbFolderName, "tables/master");
    await fs.mkdir(masterDir, { recursive: true });
    if (data.hasAuth) {
      await fs.writeFile(path.join(masterDir, `${data.userEntityKebab}.ts`), "");
      await fs.writeFile(path.join(masterDir, `${data.userEntityKebab}-config.ts`), "");
    }
  }

  if (data.hasClientCommon) {
    await fs.mkdir(path.join(cwd, "packages/client-common/src"), { recursive: true });
  }

  for (const client of data.clients) {
    const srcDir = path.join(cwd, "packages", client.name, "src");
    await fs.mkdir(srcDir, { recursive: true });
    if (client.hasRouter) {
      await fs.writeFile(path.join(srcDir, "routes.ts"), "");
    }
  }

  return cwd;
}

describe("recoverWorkspace", () => {
  it("server+DB(mysql)+인증(user/사용자)+web/mobile 클라이언트 — 전체 라운드트립", async () => {
    const cwd = await buildWorkspace({
      workspaceName: "demo",
      description: "Demo Workspace",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "main",
      hasAuth: true,
      userEntityName: "user",
      userEntityLabel: "사용자",
      mobileAppId: "kr.co.demo.app",
      clients: [
        { name: "admin", type: "web", hasRouter: true },
        { name: "pda", type: "mobile", hasRouter: false },
      ],
      serverPort: 40080,
    });

    const r = await recoverWorkspace(cwd);

    expect(r.input.workspaceName).toBe("demo");
    expect(r.input.description).toBe("Demo Workspace");
    expect(r.input.hasServer).toBe(true);
    expect(r.input.hasDb).toBe(true);
    expect(r.input.dbDialect).toBe("mysql");
    expect(r.input.dbContextName).toBe("main");
    expect(r.input.hasAuth).toBe(true);
    expect(r.input.userEntityName).toBe("user");
    expect(r.input.userEntityLabel).toBe("사용자");
    expect(r.input.mobileAppId).toBe("kr.co.demo.app");
    expect(r.input.serverPort).toBe(40080);
    expect(r.input.clients).toEqual([
      { name: "client-admin", type: "web", hasRouter: true, useSsg: false },
      { name: "client-pda", type: "mobile", hasRouter: false, useSsg: false },
    ]);
    expect(r.hasClientCommonPkg).toBe(true);
    expect(r.appStructureExportNames).toEqual(["adminAppStructureItems"]);
  });

  it("server=N + web 클라이언트 1개 — client-common 부재", async () => {
    const cwd = await buildWorkspace({
      workspaceName: "front-only",
      description: "Front Only",
      hasServer: false,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
    });

    const r = await recoverWorkspace(cwd);

    expect(r.input.hasServer).toBe(false);
    expect(r.input.hasDb).toBe(false);
    expect(r.input.hasAuth).toBe(false);
    expect(r.input.clients).toEqual([
      { name: "client-admin", type: "web", hasRouter: true, useSsg: false },
    ]);
    expect(r.hasClientCommonPkg).toBe(false);
    expect(r.appStructureExportNames).toEqual([]);
  });

  it("server=Y DB=N — DB 정보 없음", async () => {
    const cwd = await buildWorkspace({
      workspaceName: "no-db",
      description: "No DB",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 41000,
    });

    const r = await recoverWorkspace(cwd);

    expect(r.input.hasServer).toBe(true);
    expect(r.input.hasDb).toBe(false);
    expect(r.input.dbDialect).toBeUndefined();
    expect(r.input.hasAuth).toBe(false);
    expect(r.input.serverPort).toBe(41000);
  });

  it("커스텀 사용자 엔티티(employee/직원) + 커스텀 DB context 복원", async () => {
    const cwd = await buildWorkspace({
      workspaceName: "custom",
      description: "Custom",
      hasServer: true,
      hasDb: true,
      dbDialect: "postgresql",
      dbContextName: "erp",
      hasAuth: true,
      userEntityName: "employee",
      userEntityLabel: "직원",
      clients: [{ name: "admin", type: "web", hasRouter: true }],
      serverPort: 40080,
    });

    const r = await recoverWorkspace(cwd);

    expect(r.input.dbDialect).toBe("postgresql");
    expect(r.input.dbContextName).toBe("erp");
    expect(r.input.userEntityName).toBe("employee");
    expect(r.input.userEntityLabel).toBe("직원");
  });

  it("SSG 클라이언트 — prerender 로 useSsg 복원", async () => {
    const cwd = await buildWorkspace({
      workspaceName: "ssg",
      description: "SSG",
      hasServer: true,
      hasDb: false,
      clients: [{ name: "www", type: "web", hasRouter: true, useSsg: true }],
      serverPort: 40080,
    });

    const r = await recoverWorkspace(cwd);

    expect(r.input.clients).toEqual([
      { name: "client-www", type: "web", hasRouter: true, useSsg: true },
    ]);
  });

  it("클라이언트 0개 init 워크스페이스 — appStructure fallback 식별자 복원", async () => {
    const cwd = await buildWorkspace({
      workspaceName: "server-only",
      description: "Server Only",
      hasServer: true,
      hasDb: true,
      dbDialect: "mysql",
      dbContextName: "main",
      hasAuth: true,
      userEntityName: "user",
      userEntityLabel: "사용자",
      clients: [],
      serverPort: 40080,
    });

    const r = await recoverWorkspace(cwd);

    expect(r.input.clients).toEqual([]);
    expect(r.appStructureExportNames).toEqual(["appStructureItems"]);
  });

  it("sd.config.ts 없음 — 에러", async () => {
    const cwd = await createTmpDir();
    await fs.writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "broken", description: "" }),
    );

    await expect(recoverWorkspace(cwd)).rejects.toThrow();
  });

  it("루트 package.json 없음 — 에러", async () => {
    const cwd = await createTmpDir();

    await expect(recoverWorkspace(cwd)).rejects.toThrow();
  });
});
