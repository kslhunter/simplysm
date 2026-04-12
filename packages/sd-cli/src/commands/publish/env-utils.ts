import { env } from "@simplysm/core-common";

/**
 * 환경변수 치환 (%VAR% 형식)
 * @throws 치환되지 않은 환경변수가 남아있으면 에러를 던진다
 */
export function replaceEnvVariables(str: string, version: string, projectPath: string): string {
  const result = str.replace(/%([^%]+)%/g, (match, envName: string) => {
    if (envName === "VER") {
      return version;
    }
    if (envName === "PROJECT") {
      return projectPath;
    }
    return env(envName) ?? match;
  });

  // 치환되지 않은 환경변수가 남아있으면 에러 발생
  if (/%[^%]+%/.test(result)) {
    throw new Error(`환경변수 치환 실패: ${str} → ${result}`);
  }

  return result;
}

/**
 * 카운트다운과 함께 대기
 */
export async function waitWithCountdown(message: string, seconds: number): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    if (i !== seconds && process.stdout.isTTY) {
      process.stdout.cursorTo(0);
    }
    process.stdout.write(`${message} ${i}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (process.stdout.isTTY) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
  } else {
    process.stdout.write("\n");
  }
}
