import path from "path";
import fs from "fs";
import { input, confirm } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { addPackageToSdConfig, addTailwindToEslintConfig } from "../utils/config-editor";
import { spawn } from "../utils/spawn";
import { findPackageRoot } from "../utils/package-utils";

//#region Types

/**
 * Add-client 명령 옵션
 */
export interface AddClientOptions {}

//#endregion

//#region Utilities
//#endregion

//#region Main

/**
 * 클라이언트 패키지를 프로젝트에 추가한다.
 *
 * 1. 프로젝트 루트 확인 (sd.config.ts 존재)
 * 2. 대화형 프롬프트 (이름 접미사, 라우터 사용 여부)
 * 3. 패키지 디렉토리 중복 확인
 * 4. Handlebars 템플릿 렌더링
 * 5. sd.config.ts에 패키지 항목 추가 (ts-morph)
 * 6. eslint.config.ts에 tailwind 설정 추가 (첫 클라이언트인 경우)
 * 7. pnpm install
 */
export async function runAddClient(_options: AddClientOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:add-client");

  // 1. 프로젝트 루트 확인
  if (!fs.existsSync(path.join(cwd, "sd.config.ts"))) {
    consola.error("sd.config.ts를 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요.");
    process.exitCode = 1;
    return;
  }

  // 프로젝트명
  const projectName = path.basename(cwd);

  // 2. 대화형 프롬프트
  const clientSuffix = await input({
    message: "클라이언트 이름을 입력하세요 (client-___):",
    validate: (value) => {
      if (!value.trim()) return "이름을 입력해주세요.";
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "소문자, 숫자, 하이픈만 사용 가능합니다.";
      return true;
    },
  });

  const useRouter = await confirm({
    message: "라우터를 사용하시겠습니까?",
    default: true,
  });

  const clientName = `client-${clientSuffix}`;

  // 3. 패키지 디렉토리 중복 확인
  const packageDir = path.join(cwd, "packages", clientName);
  if (fs.existsSync(packageDir)) {
    consola.error(`packages/${clientName} 디렉토리가 이미 존재합니다.`);
    process.exitCode = 1;
    return;
  }

  // 4. 템플릿 렌더링
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "add-client");

  const context = {
    projectName,
    clientSuffix,
    clientName,
    router: useRouter,
  };

  const dirReplacements = {
    __CLIENT__: clientName,
  };

  logger.info(`${clientName} 패키지 생성 중...`);
  await renderTemplateDir(templateDir, path.join(cwd, "packages"), context, dirReplacements);
  logger.success(`packages/${clientName} 생성 완료`);

  // 5. sd.config.ts 업데이트
  const sdConfigPath = path.join(cwd, "sd.config.ts");
  const added = addPackageToSdConfig(sdConfigPath, clientName, { target: "client" });
  if (added) {
    logger.success("sd.config.ts 업데이트 완료");
  } else {
    consola.warn(`"${clientName}"이(가) sd.config.ts에 이미 존재합니다.`);
  }

  // 6. eslint.config.ts tailwind 설정 추가 (첫 클라이언트인 경우)
  const eslintConfigPath = path.join(cwd, "eslint.config.ts");
  if (fs.existsSync(eslintConfigPath)) {
    const tailwindAdded = addTailwindToEslintConfig(eslintConfigPath, clientName);
    if (tailwindAdded) {
      logger.success("eslint.config.ts에 tailwind 설정 추가");
    }
  }

  // 7. pnpm install
  logger.info("pnpm install 실행 중...");
  await spawn("pnpm", ["install"], { cwd });
  logger.success("pnpm install 완료");

  // 완료
  consola.box(
    [`클라이언트 "${clientName}"이(가) 추가되었습니다!`, "", `  pnpm dev ${clientName}    개발 서버 실행`].join("\n"),
  );
}

//#endregion
