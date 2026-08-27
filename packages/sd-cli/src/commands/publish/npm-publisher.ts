import path from "path";
import os from "os";
import semver from "semver";
import type { ConsolaInstance } from "consola";
import { err as errNs } from "@simplysm/core-common";
import { fsx } from "@simplysm/core-node";
import { shellSpawn } from "../../utils/shell-spawn";

/** npm classic OTP 형식 (6자리 숫자) */
const OTP_PATTERN = /^\d{6}$/;

/** 로그, 에러 메시지에 OTP 코드 대신 남길 문자열 */
const OTP_MASK = "******";

/**
 * OTP 코드 형식을 검증한다.
 *
 * 셸을 거쳐 `--otp` 인자로 전달되므로, 형식을 벗어난 값은 주입 위험이 있어 거부한다.
 */
export function validateOtp(otp: string): string {
  const trimmed = otp.trim();
  if (!OTP_PATTERN.test(trimmed)) {
    throw new Error("OTP 는 6자리 숫자여야 합니다.");
  }
  return trimmed;
}

/**
 * 배포에 쓸 dist-tag 를 정한다. `undefined` 면 태그 없이 올려 `latest` 를 갱신한다.
 *
 * 레지스트리의 `latest` 보다 낮은 버전을 태그 없이 올리면 npm 이 거부한다. `--tag latest` 로
 * 밀어붙이면 `latest` 가 끌어내려져 상위 라인 사용자가 깨지므로, `latest-14` 같은 별도 태그를 붙인다.
 *
 * 태그 이름에 `v14`, `14.x` 는 쓸 수 없다. npm 은 semver 범위로 해석되는 이름을 거부한다.
 */
async function resolveDistTag(
  npmName: string,
  version: string,
  logger: ConsolaInstance,
): Promise<string | undefined> {
  // prerelease 는 절대 latest 가 되면 안 되므로 반드시 태그를 붙인다.
  const prereleaseInfo = semver.prerelease(version);
  if (prereleaseInfo != null) {
    // 식별자가 숫자(`14.3.0-1`)이거나 범위로 읽히면 태그 이름으로 쓸 수 없다.
    const identifier = String(prereleaseInfo[0]);
    return semver.validRange(identifier) == null
      ? identifier
      : `pre-${semver.major(version)}`;
  }

  let latest: string;
  try {
    const { stdout } = await shellSpawn("npm", ["view", `"${npmName}"`, "dist-tags.latest"]);
    latest = stdout.trim();
  } catch {
    // 아직 배포된 적 없거나 레지스트리 조회가 실패한 경우. 태그 없이 올린다.
    // 조회 실패로 태그를 놓쳐도 npm 이 "latest 보다 낮다"며 거부하므로 조용히 잘못되지 않는다.
    logger.debug(`[${npmName}] latest 조회 실패. 태그 없이 배포합니다.`);
    return undefined;
  }

  if (semver.valid(latest) == null || !semver.lt(version, latest)) return undefined;

  const tag = `latest-${semver.major(version)}`;
  logger.info(`[${npmName}] latest(${latest})가 더 높아 '${tag}' 태그로 배포합니다.`);
  return tag;
}

/**
 * npm 레지스트리에 패키지를 배포한다.
 *
 * `pnpm pack` 으로 tarball 을 만든 뒤 `npm publish` 로 올린다. 두 단계로 나누는 이유:
 * - `workspace:*` 치환과 `publishConfig` 머지는 pnpm 만 해준다. → pack 을 pnpm 으로 한다.
 * - 2FA 인증(브라우저 로그인 창, OTP 프롬프트)은 npm 이 처리해준다. → publish 를 npm 으로 하고
 *   TTY 를 그대로 물려줘(`stdio: "inherit"`) npm 이 사용자와 직접 대화하게 한다.
 */
export async function publishNpm(
  pkgPath: string,
  pkgName: string,
  version: string,
  logger: ConsolaInstance,
  dryRun: boolean,
  otp: string | undefined,
): Promise<void> {
  const tmpDir = path.join(os.tmpdir(), `sd-cli-pack-${pkgName}-${Date.now().toString(36)}`);
  await fsx.mkdir(tmpDir);

  try {
    logger.debug(`[${pkgName}] pnpm pack`);
    await shellSpawn("pnpm", ["pack", "--pack-destination", `"${tmpDir}"`], { cwd: pkgPath });

    const tarball = (await fsx.readdir(tmpDir)).find((f) => f.endsWith(".tgz"));
    if (tarball == null) {
      throw new Error(`[${pkgName}] pack 결과 tarball 을 찾을 수 없습니다.`);
    }

    const args = ["publish", `"${path.join(tmpDir, tarball)}"`, "--access", "public"];

    const { name: npmName } = await fsx.readJson<{ name: string }>(
      path.resolve(pkgPath, "package.json"),
    );
    const tag = await resolveDistTag(npmName, version, logger);
    if (tag != null) {
      args.push("--tag", tag);
    }

    // 명령줄에 들어가는 값과 마스킹 대상이 어긋나지 않도록 검증본 하나만 쓴다.
    const otpCode = otp == null ? undefined : validateOtp(otp);
    if (otpCode != null) {
      args.push("--otp", otpCode);
    }

    if (dryRun) {
      args.push("--dry-run");
    }

    // OTP 코드가 로그에 남지 않도록 마스킹한다.
    const maskedArgs = args.map((arg, i) => (args[i - 1] === "--otp" ? OTP_MASK : arg));
    if (dryRun) {
      logger.info(`[DRY-RUN] [${pkgName}] npm ${maskedArgs.join(" ")}`);
    } else {
      logger.debug(`[${pkgName}] npm ${maskedArgs.join(" ")}`);
    }

    try {
      // stdio 를 물려주므로 npm 출력이 화면에 그대로 나온다. 인증이 필요하면 npm 이 직접 안내한다.
      await shellSpawn("npm", args, { cwd: pkgPath, stdio: "inherit" });
    } catch (err) {
      // stdio 를 넘겼으므로 실패 사유는 캡처되지 않고 화면에만 남는다. 어디를 봐야 하는지 알린다.
      const hint = `\n실패 사유는 위 npm 출력을 확인하세요.`;
      // 실패 메시지에는 실행된 명령줄이 그대로 담기므로 OTP 코드를 마스킹한다.
      const mask = (s: string): string =>
        otpCode == null ? s : s.replaceAll(otpCode, OTP_MASK);

      const wrapped = new Error(mask(errNs.message(err)) + hint);
      // 원본 스택을 잃지 않도록 마스킹한 스택을 그대로 옮긴다.
      wrapped.stack = mask(errNs.stack(err));
      throw wrapped;
    }
  } finally {
    // 정리 실패가 원래 배포 실패를 덮지 않도록 삼킨다.
    try {
      await fsx.rm(tmpDir);
    } catch (err) {
      logger.debug(`[${pkgName}] 임시 디렉터리 정리 실패: ${errNs.message(err)}`);
    }
  }
}
