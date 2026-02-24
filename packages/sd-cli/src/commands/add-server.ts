import path from "path";
import fs from "fs";
import { input, checkbox } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { addPackageToSdConfig, setClientServerInSdConfig } from "../utils/config-editor";
import { execa } from "execa";
import { findPackageRoot } from "../utils/package-utils";

//#region Types

/**
 * Add-server 명령 옵션
 */
export interface AddServerOptions {}

//#endregion

//#region Utilities

/**
 * sd.config.ts를 읽어서 target이 "client"인 패키지명 목록을 반환한다.
 */
function findClientPackages(sdConfigPath: string): string[] {
  const content = fs.readFileSync(sdConfigPath, "utf-8");
  const clients: string[] = [];

  // 간단한 패턴 매칭으로 client 패키지 찾기
  const regex = /"([^"]+)":\s*\{[^}]*target:\s*"client"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) != null) {
    clients.push(match[1]);
  }
  return clients;
}

//#endregion

//#region Main

/**
 * 서버 패키지를 프로젝트에 추가한다.
 *
 * 1. 프로젝트 루트 확인
 * 2. 대화형 프롬프트 (이름 접미사, 클라이언트 선택)
 * 3. 패키지 디렉토리 중복 확인
 * 4. Handlebars 템플릿 렌더링
 * 5. sd.config.ts에 서버 패키지 항목 추가
 * 6. 선택된 클라이언트의 server 필드 업데이트
 * 7. pnpm install
 */
export async function runAddServer(_options: AddServerOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:add-server");

  // 1. 프로젝트 루트 확인
  const sdConfigPath = path.join(cwd, "sd.config.ts");
  if (!fs.existsSync(sdConfigPath)) {
    consola.error("sd.config.ts를 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요.");
    process.exitCode = 1;
    return;
  }

  const projectName = path.basename(cwd);

  // 2. 대화형 프롬프트
  const serverSuffix = await input({
    message: '서버 이름 접미사 (비워두면 "server"):',
    validate: (value) => {
      if (value.trim() === "") return true; // 빈 값 허용
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "소문자, 숫자, 하이픈만 사용 가능합니다.";
      return true;
    },
  });

  const serverName = serverSuffix.trim() === "" ? "server" : `server-${serverSuffix}`;

  // 클라이언트 선택 (기존 클라이언트가 있는 경우)
  const clientPackages = findClientPackages(sdConfigPath);
  let selectedClients: string[] = [];

  if (clientPackages.length > 0) {
    selectedClients = await checkbox({
      message: "이 서버가 서비스할 클라이언트를 선택하세요:",
      choices: clientPackages.map((name) => ({ name, value: name })),
    });
  }

  // 3. 패키지 디렉토리 중복 확인
  const packageDir = path.join(cwd, "packages", serverName);
  if (fs.existsSync(packageDir)) {
    consola.error(`packages/${serverName} 디렉토리가 이미 존재합니다.`);
    process.exitCode = 1;
    return;
  }

  // 4. 템플릿 렌더링
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "add-server");

  const context = {
    projectName,
    serverName,
    port: 3000,
  };

  const dirReplacements = {
    __SERVER__: serverName,
  };

  logger.info(`${serverName} 패키지 생성 중...`);
  await renderTemplateDir(templateDir, path.join(cwd, "packages"), context, dirReplacements);
  logger.success(`packages/${serverName} 생성 완료`);

  // 5. sd.config.ts에 서버 패키지 추가
  const added = addPackageToSdConfig(sdConfigPath, serverName, { target: "server" });
  if (added) {
    logger.success("sd.config.ts에 서버 패키지 추가 완료");
  } else {
    consola.warn(`"${serverName}"이(가) sd.config.ts에 이미 존재합니다.`);
  }

  // 6. 선택된 클라이언트의 server 필드 업데이트
  for (const clientName of selectedClients) {
    setClientServerInSdConfig(sdConfigPath, clientName, serverName);
    logger.info(`${clientName}의 서버를 "${serverName}"으로 설정`);
  }

  // 7. pnpm install
  logger.info("pnpm install 실행 중...");
  await execa("pnpm", ["install"], { cwd });
  logger.success("pnpm install 완료");

  // 완료
  consola.box(`서버 "${serverName}"이(가) 추가되었습니다!`);
}

//#endregion
