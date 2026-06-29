import crypto from "crypto";
import path from "path";
import { createLogger } from "@simplysm/core-common";
import { fsx } from "@simplysm/core-node";
import { generateClient } from "./generators/client";
import { normalize } from "./normalize";
import {
  type FilePatch,
  patchAppStructure,
  patchDevService,
  patchRootPackageJson,
  patchSdConfig,
  patchVitestConfig,
} from "./patch";
import { promptInitClient } from "./prompts";
import { recoverWorkspace } from "./recover";
import type { InitInput, RenderData } from "./types";
import { validateInitClientInput } from "./validate";
import { shellSpawn } from "../../utils/shell-spawn";

const logger = createLogger("sd:cli:init-client");

export interface InitClientOptions {
  cwd: string;
}

export async function runInitClient(opts: InitClientOptions): Promise<void> {
  const recovered = await recoverWorkspace(opts.cwd);

  const { client: newClientInput, mobileAppId } = await promptInitClient(
    recovered.input.mobileAppId != null,
  );
  await validateInitClientInput(opts.cwd, newClientInput, recovered.input.clients);

  const mergedInput: InitInput = {
    ...recovered.input,
    clients: [...recovered.input.clients, newClientInput],
    mobileAppId: recovered.input.mobileAppId ?? mobileAppId,
  };
  const data: RenderData = {
    ...normalize(mergedInput),
    // client-common 은 새로 생성하지 않음 — 실재 여부에 맞춰 신규 클라이언트의 의존 포함 여부 결정
    hasClientCommon: recovered.hasClientCommonPkg,
    jwtSecret: crypto.randomBytes(32).toString("hex"),
  };
  const client = data.clients[data.clients.length - 1];
  const outDir = path.resolve(opts.cwd, "packages", client.name);

  //-- mobile 은 루트 package.json 의 description 이 capacitor 앱 표시 이름(appName)으로 들어감
  if (client.isMobile && data.description.trim().length === 0) {
    throw new Error(
      "mobile 클라이언트는 capacitor 앱 표시 이름으로 루트 package.json 의 description 을 사용합니다. description 을 채운 뒤 다시 실행하세요.",
    );
  }

  //-- 공유 파일 패치를 메모리에서 준비 (원자성: 전부 준비된 뒤에만 기록)
  const isFirstMobile =
    client.isMobile && recovered.input.clients.every((c) => c.type !== "mobile");
  const needsAppStructure = data.hasAuth && client.hasRouter;

  //-- 기존 라우팅 클라이언트 0개면 기본 메뉴 구조 export("appStructureItems")는
  //   파일에 남기되 서버 초기화의 import·권한 계산에서 신규 export 로 대체 (init 동등)
  const isFirstRouterClient = recovered.input.clients.every((c) => !c.hasRouter);
  const fallbackExportName =
    isFirstRouterClient && recovered.appStructureExportNames.includes("appStructureItems")
      ? "appStructureItems"
      : undefined;
  const combineExportNames =
    fallbackExportName != null
      ? recovered.appStructureExportNames.filter((n) => n !== fallbackExportName)
      : recovered.appStructureExportNames;

  const patchTargets: { relPath: string; apply: (src: string) => FilePatch }[] = [
    { relPath: "sd.config.ts", apply: (src) => patchSdConfig(src, data, client) },
    { relPath: "vitest.config.ts", apply: (src) => patchVitestConfig(src, client) },
    ...(isFirstMobile
      ? [{ relPath: "package.json", apply: (src: string) => patchRootPackageJson(src, client) }]
      : []),
    ...(needsAppStructure
      ? [
          {
            relPath: "packages/common/src/app-structure.ts",
            apply: (src: string) => patchAppStructure(src, data, client),
          },
          {
            relPath: "packages/server/src/services/dev.service.ts",
            apply: (src: string) =>
              patchDevService(src, combineExportNames, data, client, fallbackExportName),
          },
        ]
      : []),
  ];

  const writes: { absPath: string; content: string }[] = [];
  const manualGuides: { relPath: string; snippet: string }[] = [];
  for (const target of patchTargets) {
    const absPath = path.resolve(opts.cwd, target.relPath);
    if (!(await fsx.exists(absPath))) {
      const r = target.apply("");
      manualGuides.push({ relPath: target.relPath, snippet: r.snippet });
      continue;
    }
    const r = target.apply(await fsx.read(absPath));
    if (r.patched != null) {
      writes.push({ absPath, content: r.patched });
    } else {
      manualGuides.push({ relPath: target.relPath, snippet: r.snippet });
    }
  }

  logger.info(`클라이언트 패키지 생성 시작: packages/${client.name}`);

  //-- 신규 패키지 생성 (실패 시 생성분 제거 후 중단 — 공유 파일은 아직 미기록)
  try {
    await generateClient(opts.cwd, data, client);
  } catch (err) {
    try {
      await fsx.rm(outDir);
    } catch {
      const leftovers = await fsx.glob(path.join(outDir, "**/*")).catch(() => []);
      logger.error(
        `생성 잔여물 제거 실패 — packages/${client.name} 를 수동 삭제하세요. 남은 항목:\n` +
          [outDir, ...leftovers].map((p) => `  - ${p}`).join("\n"),
      );
    }
    throw err;
  }

  //-- 공유 파일 일괄 기록
  for (const w of writes) {
    await fsx.write(w.absPath, w.content);
  }

  logger.info(`클라이언트 패키지 생성 완료: packages/${client.name}`);

  for (const guide of manualGuides) {
    logger.error(
      `${guide.relPath} 자동 갱신 실패 — 아래 내용을 직접 반영하세요:\n${guide.snippet}`,
    );
  }

  logger.info("의존성 설치 중...");
  await shellSpawn("bun", ["install"], {
    cwd: opts.cwd,
    stdio: "inherit",
  });
  logger.info("의존성 설치 완료.");

  if (client.isMobile) {
    logger.info("다음 단계:");
    logger.info(
      `  1. (prod 빌드 필요 시) capacitor 키스토어를 packages/${client.name}/res/ 에 배치 후 sd.config.ts 의 capacitor.platform.android.sign 블록 수동 추가`,
    );
  }
}
