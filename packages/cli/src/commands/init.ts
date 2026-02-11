import path from "path";
import fs from "fs";
import { input, confirm } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { spawn } from "../utils/spawn";

//#region Types

/**
 * Init 명령 옵션
 */
export interface InitOptions {}

//#endregion

//#region Utilities

/**
 * import.meta.dirname에서 상위로 올라가며 package.json을 찾아 패키지 루트를 반환한다.
 */
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json을 찾을 수 없습니다.");
    dir = parent;
  }
  return dir;
}

/**
 * npm 스코프 이름 유효성 검증
 */
function isValidScopeName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

//#endregion

//#region Main

/**
 * 새 Simplysm 프로젝트를 현재 디렉토리에 초기화한다.
 *
 * 1. 디렉토리 비어있는지 확인
 * 2. 프로젝트명(폴더명) 검증
 * 3. 대화형 프롬프트로 설정 수집
 * 4. Handlebars 템플릿 렌더링
 * 5. pnpm install + sd-cli install 실행
 */
export async function runInit(_options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:init");

  // 1. 디렉토리 비어있는지 확인
  const entries = fs.readdirSync(cwd);
  if (entries.length > 0) {
    consola.error("디렉토리가 비어있지 않습니다. 빈 디렉토리에서 실행해주세요.");
    process.exitCode = 1;
    return;
  }

  // 2. 프로젝트명 검증
  const projectName = path.basename(cwd);
  if (!isValidScopeName(projectName)) {
    consola.error(`프로젝트 이름 "${projectName}"이(가) 유효하지 않습니다. 소문자, 숫자, 하이픈만 사용 가능합니다.`);
    process.exitCode = 1;
    return;
  }

  // 3. 대화형 프롬프트
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

  // 4. 템플릿 렌더링
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "init");

  const context = {
    projectName,
    clientSuffix,
    clientName,
    router: useRouter,
  };

  const dirReplacements = {
    __CLIENT__: clientName,
  };

  logger.info("프로젝트 파일 생성 중...");
  await renderTemplateDir(templateDir, cwd, context, dirReplacements);
  logger.success("프로젝트 파일 생성 완료");

  // 5. pnpm install
  logger.info("pnpm install 실행 중...");
  await spawn("pnpm", ["install"], { cwd });
  logger.success("pnpm install 완료");

  // 6. 완료 메시지
  consola.box(
    [
      `프로젝트가 생성되었습니다!`,
      "",
      `  sd-claude install          Claude Code 스킬 설치`,
      `  pnpm dev ${clientName}    개발 서버 실행`,
    ].join("\n"),
  );
}

//#endregion
