import crypto from "crypto";
import { createLazyLogger } from "../../runtime/lazy-logger";
import { generateClient } from "./generators/client";
import { generateClientCommon } from "./generators/client-common";
import { generateCommon } from "./generators/common";
import { generateRoot } from "./generators/root";
import { generateServer } from "./generators/server";
import { normalize } from "./normalize";
import { promptInit } from "./prompts";
import type { RenderData } from "./types";
import { validateBeforePrompt, validateInput } from "./validate";

const logger = createLazyLogger("sd:cli:init");

export interface InitOptions {
  cwd: string;
}

export async function runInit(opts: InitOptions): Promise<void> {
  await validateBeforePrompt(opts.cwd);

  const input = await promptInit();
  validateInput(input);

  const normalized = normalize(input);
  const data: RenderData = {
    ...normalized,
    jwtSecret: crypto.randomBytes(32).toString("hex"),
  };

  logger.info(`워크스페이스 부트스트랩 시작: ${opts.cwd}`);

  await generateRoot(opts.cwd, data);
  if (data.hasServer) await generateServer(opts.cwd, data);
  if (data.hasCommon) await generateCommon(opts.cwd, data);
  if (data.hasClientCommon) await generateClientCommon(opts.cwd, data);
  for (const client of data.clients) {
    await generateClient(opts.cwd, data, client);
  }

  logger.info("워크스페이스 부트스트랩 완료.");

  const steps: string[] = ["pnpm install"];
  if (data.hasDb) {
    steps.push("sd.config.ts 의 configs.orm.MAIN 접속 정보 (host/port/user/password/database) 를 실제 값으로 수정");
  }
  if (data.hasMobile) {
    steps.push(`(prod 빌드 필요 시) capacitor 키스토어를 packages/${data.firstMobileClientName!}/res/ 에 배치 후 sd.config.ts 의 capacitor.platform.android.sign 블록 수동 추가`);
  }
  steps.push("CLAUDE.md 가 필요하면 Claude Code 내장 /init 으로 작성");

  logger.info("다음 단계:");
  steps.forEach((s, i) => logger.info(`  ${i + 1}. ${s}`));
}
