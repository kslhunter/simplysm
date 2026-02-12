import { spawn as cpSpawn, type SpawnOptions as CpSpawnOptions } from "child_process";

/**
 * spawn 옵션
 */
export interface SpawnOptions {
  /** 작업 디렉토리 */
  cwd?: string;
  /** 환경변수 (process.env와 병합) */
  env?: Record<string, string | undefined>;
  /** 색상 출력 강제 여부 (기본값: NO_COLOR 환경변수 존중) */
  forceColor?: boolean;
}

/**
 * child_process.spawn을 Promise로 래핑한 함수.
 *
 * - stdout/stderr를 캡처하여 반환
 * - NO_COLOR 환경변수 존중 (forceColor로 오버라이드 가능)
 * - 종료 코드가 0이 아니면 에러 throw
 * - Windows에서도 shell 없이 실행 (보안상 shell: true 사용 안 함)
 *
 * @param cmd - 실행할 명령어
 * @param args - 명령어 인자
 * @param options - 실행 옵션
 * @returns stdout 출력 (stderr는 stdout에 병합됨)
 */
export async function spawn(cmd: string, args: string[], options?: SpawnOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // NO_COLOR 환경변수 존중 (https://no-color.org/)
    const noColor = process.env["NO_COLOR"] != null;
    const useColor = options?.forceColor ?? !noColor;

    const colorEnv = useColor
      ? {
          FORCE_COLOR: "1",
          CLICOLOR_FORCE: "1",
          COLORTERM: "truecolor",
        }
      : {};

    const spawnOptions: CpSpawnOptions = {
      cwd: options?.cwd,
      env: {
        ...process.env,
        ...colorEnv,
        ...options?.env,
      },
      // shell: false for security (avoid shell injection)
      // Windows .bat/.cmd files are handled by calling cmd.exe explicitly in capacitor.ts
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    };

    const child = cpSpawn(cmd, args, spawnOptions);

    let output = "";

    child.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    child.on("error", (err) => {
      reject(new Error(`spawn 실패 (${cmd}): ${err.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`명령어 실패 (${cmd} ${args.join(" ")})\n종료 코드: ${code}\n출력:\n${output}`));
      }
    });
  });
}
