import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalize } from "../../src/commands/init/normalize";
import {
  patchAppStructure,
  patchDevService,
  patchRootPackageJson,
  patchSdConfig,
  patchVitestConfig,
} from "../../src/commands/init/patch";
import { renderTemplate } from "../../src/commands/init/render";
import type { ClientInputSpec, InitInput, RenderData } from "../../src/commands/init/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TPL_ROOT = path.resolve(__dirname, "../../src/commands/init/templates");

function buildData(input: InitInput): RenderData {
  return { ...normalize(input), jwtSecret: "test-jwt-secret" };
}

const baseInput: InitInput = {
  workspaceName: "demo",
  description: "Demo Workspace",
  hasServer: true,
  hasDb: true,
  dbDialect: "mysql",
  dbContextName: "main",
  hasAuth: true,
  userEntityName: "user",
  userEntityLabel: "사용자",
  clients: [{ name: "admin", type: "web", hasRouter: true }],
  serverPort: 40080,
};

/** before: 기존 클라이언트만 / after: 신규 클라이언트 포함 — 라운드트립 동등성 기준 데이터 쌍 */
function buildPair(
  newClient: ClientInputSpec,
  inputOverride?: Partial<InitInput>,
): { before: RenderData; after: RenderData; client: RenderData["clients"][number] } {
  const input = { ...baseInput, ...inputOverride };
  const before = buildData(input);
  const after = buildData({ ...input, clients: [...input.clients, newClient] });
  const client = after.clients[after.clients.length - 1];
  return { before, after, client };
}

describe("patchSdConfig", () => {
  it("web 클라이언트 추가 — init 동등 결과", async () => {
    const { before, after, client } = buildPair({ name: "portal", type: "web", hasRouter: true });
    const tplPath = path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs");
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchSdConfig(source, after, client);

    expect(r.patched).toBe(expected);
  });

  it("mobile 클라이언트 추가 (appId 포함) — init 동등 결과", async () => {
    const { before, after, client } = buildPair(
      { name: "pda", type: "mobile", hasRouter: false },
      { mobileAppId: "kr.co.demo.app" },
    );
    const tplPath = path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs");
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchSdConfig(source, after, client);

    expect(r.patched).toBe(expected);
  });

  it("SSG 클라이언트 추가 — prerender 포함", async () => {
    const { before, after, client } = buildPair({
      name: "www",
      type: "web",
      hasRouter: true,
      useSsg: true,
    });
    const tplPath = path.join(TPL_ROOT, "workspace-root/sd.config.ts.hbs");
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchSdConfig(source, after, client);

    expect(r.patched).toBe(expected);
  });

  it("packages 정의를 찾을 수 없으면 패치 실패 + 스니펫 제공", () => {
    const { after, client } = buildPair({ name: "portal", type: "web", hasRouter: true });

    const r = patchSdConfig("export default {};\n", after, client);

    expect(r.patched).toBeUndefined();
    expect(r.snippet).toContain('"client-portal"');
  });
});

describe("patchVitestConfig", () => {
  it("클라이언트 project 추가 — init 동등 결과", async () => {
    const { before, after, client } = buildPair({ name: "portal", type: "web", hasRouter: true });
    const tplPath = path.join(TPL_ROOT, "workspace-root/vitest.config.ts.hbs");
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchVitestConfig(source, client);

    expect(r.patched).toBe(expected);
  });

  it("projects 배열을 찾을 수 없으면 패치 실패 + 스니펫 제공", () => {
    const { client } = buildPair({ name: "portal", type: "web", hasRouter: true });

    const r = patchVitestConfig("export default {};\n", client);

    expect(r.patched).toBeUndefined();
    expect(r.snippet).toContain("client-portal");
  });
});

describe("patchRootPackageJson", () => {
  it("첫 mobile 클라이언트 — run-device 스크립트 추가, init 동등 결과", async () => {
    const { before, after, client } = buildPair(
      { name: "pda", type: "mobile", hasRouter: false },
      { mobileAppId: "kr.co.demo.app" },
    );
    const tplPath = path.join(TPL_ROOT, "workspace-root/package.json.hbs");
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchRootPackageJson(source, client);

    expect(r.patched).toBe(expected);
  });

  it("scripts 앵커를 찾을 수 없으면 패치 실패 + 스니펫 제공", () => {
    const { client } = buildPair(
      { name: "pda", type: "mobile", hasRouter: false },
      { mobileAppId: "kr.co.demo.app" },
    );

    const r = patchRootPackageJson("{}", client);

    expect(r.patched).toBeUndefined();
    expect(r.snippet).toContain("run-device");
  });
});

describe("patchAppStructure", () => {
  it("라우팅 클라이언트 추가 — export 블록 추가, init 동등 결과", async () => {
    const { before, after, client } = buildPair({ name: "portal", type: "web", hasRouter: true });
    const tplPath = path.join(TPL_ROOT, "common/src/app-structure.ts.hbs");
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchAppStructure(source, after, client);

    expect(r.patched).toBe(expected);
  });
});

describe("patchDevService", () => {
  const tplPath = path.join(TPL_ROOT, "server/src/services/dev.service.ts.hbs");

  it("1개 → 2개 — import 추가 + 권한 평탄화 인자가 배열 결합으로 교체", async () => {
    const { before, after, client } = buildPair({ name: "portal", type: "web", hasRouter: true });
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchDevService(source, before.appStructureNames, after, client);

    expect(r.patched).toBe(expected);
  });

  it("2개 → 3개 — 기존 배열 결합에 원소 추가", async () => {
    const twoClients: InitInput = {
      ...baseInput,
      clients: [
        { name: "admin", type: "web", hasRouter: true },
        { name: "portal", type: "web", hasRouter: true },
      ],
    };
    const before = buildData(twoClients);
    const after = buildData({
      ...twoClients,
      clients: [...twoClients.clients, { name: "shop", type: "web", hasRouter: true }],
    });
    const client = after.clients[after.clients.length - 1];
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchDevService(source, before.appStructureNames, after, client);

    expect(r.patched).toBe(expected);
  });

  it("0개 → 1개 (기본 export 워크스페이스) — import·권한 인자가 신규 단독으로 대체, init 동등 결과", async () => {
    const serverOnly: InitInput = { ...baseInput, clients: [] };
    const before = buildData(serverOnly); // appStructureNames = ["appStructureItems"]
    const after = buildData({
      ...serverOnly,
      clients: [{ name: "portal", type: "web", hasRouter: true }],
    });
    const client = after.clients[after.clients.length - 1];
    const source = await renderTemplate(tplPath, before);
    const expected = await renderTemplate(tplPath, after);

    const r = patchDevService(source, [], after, client, "appStructureItems");

    expect(r.patched).toBe(expected);
  });

  it("import 앵커를 찾을 수 없으면 패치 실패 + 스니펫 제공", () => {
    const { before, after, client } = buildPair({ name: "portal", type: "web", hasRouter: true });

    const r = patchDevService("export const x = 1;\n", before.appStructureNames, after, client);

    expect(r.patched).toBeUndefined();
    expect(r.snippet).toContain(client.appStructureName);
  });
});
