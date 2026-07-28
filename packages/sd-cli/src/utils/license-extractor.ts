import path from "path";
import { fsx } from "@simplysm/core-node";
import type esbuild from "esbuild";

/** 빌드 산출물에 기록하는 제3자 라이선스 고지 파일명 */
export const LICENSE_NOTICE_FILE_NAME = "3rdpartylicenses.txt";

/** 패키지 경계를 나타내는 경로 세그먼트 */
const NODE_MODULES_SEGMENT = "node_modules";

/** 패키지 루트에서 라이선스 본문을 찾을 때 시도하는 파일명 */
const LICENSE_FILE_NAMES = ["LICENSE", "LICENSE.txt", "LICENSE.md"];

/** npm 이 정한 커스텀 라이선스 표기 접두사 (`SEE LICENSE IN <파일명>`) */
const CUSTOM_LICENSE_PREFIX = "SEE LICENSE IN ";

/** 고지 파일의 패키지 항목 구분선 */
const ENTRY_SEPARATOR = "-".repeat(80);

/** 고지 파일 머리말 */
const FILE_HEADER = "이 파일은 함께 배포되는 산출물에 포함된 제3자 패키지의 라이선스 고지입니다.";

/**
 * 라이선스 판정에 사용하는 package.json 필드.
 *
 * `license` 오브젝트와 `licenses` 배열은 npm 이 deprecated 로 지정한 표기지만
 * 실제 배포된 구 패키지에 남아 있어, 라이선스 미상 오판을 막기 위해 함께 인식한다.
 * (https://docs.npmjs.com/cli/v11/configuring-npm/package-json)
 */
interface LicenseManifest {
  name?: string;
  version?: string;
  license?: string | { type?: string };
  licenses?: { type?: string }[];
}

/** metafile 입력 경로에서 역추적한 패키지 위치 */
export interface PackageRef {
  packageName: string;
  packageDir: string;
}

/**
 * `node_modules` 아래 파일의 절대 경로에서 그 파일이 속한 패키지를 역추적한다.
 *
 * 경로를 상위로 거슬러 올라가며 `node_modules` 세그먼트를 찾고, 직전까지 지나온
 * 세그먼트로 패키지명을 조립한다. `@scope/name` 형태는 두 세그먼트를 한 이름으로 합친다.
 *
 * @returns `node_modules` 를 거치지 않는 경로(자체 소스, 워크스페이스 패키지)면 undefined
 */
export function resolvePackageRef(absInputPath: string): PackageRef | undefined {
  let dir = absInputPath;
  let nameOrScope: string | undefined;
  let nameOrFile: string | undefined;
  let found = false;

  while (dir !== path.dirname(dir)) {
    const segment = path.basename(dir);
    if (segment === NODE_MODULES_SEGMENT) {
      found = true;
      break;
    }
    nameOrFile = nameOrScope;
    nameOrScope = segment;
    dir = path.dirname(dir);
  }

  if (!found || nameOrScope == null) return undefined;

  const packageName =
    nameOrScope.startsWith("@") && nameOrFile != null
      ? `${nameOrScope}/${nameOrFile}`
      : nameOrScope;

  return { packageName, packageDir: path.join(dir, packageName) };
}

/**
 * package.json 에서 라이선스 식별자를 뽑는다.
 *
 * @returns 어떤 표기로도 라이선스를 알 수 없으면 undefined
 */
export function resolveLicenseId(manifest: LicenseManifest): string | undefined {
  if (typeof manifest.license === "string") {
    const trimmed = manifest.license.trim();
    if (trimmed !== "") return trimmed;
  } else if (manifest.license != null) {
    const type = manifest.license.type?.trim();
    if (type != null && type !== "") return type;
  }

  const legacyTypes = (manifest.licenses ?? [])
    .map((item) => item.type?.trim())
    .filter((type): type is string => type != null && type !== "");
  if (legacyTypes.length > 0) return legacyTypes.join(" OR ");

  return undefined;
}

/**
 * 패키지 루트에서 라이선스 본문을 읽는다.
 *
 * `SEE LICENSE IN <파일명>` 표기면 그 파일을 읽고, 아니면 관용적인 LICENSE 파일명을 차례로 시도한다.
 *
 * @returns 라이선스 파일을 동봉하지 않은 패키지면 undefined (식별자만으로 고지가 성립한다)
 * @throws `SEE LICENSE IN` 이 가리키는 파일을 읽을 수 없을 때
 */
async function readLicenseText(
  packageRef: PackageRef,
  licenseId: string,
): Promise<string | undefined> {
  if (licenseId.toUpperCase().startsWith(CUSTOM_LICENSE_PREFIX)) {
    const fileName = licenseId.slice(CUSTOM_LICENSE_PREFIX.length).trim();
    const normalized = path.normalize(fileName);
    if (path.isAbsolute(normalized) || normalized.startsWith("..")) {
      throw new Error(
        `라이선스 파일 경로가 패키지 바깥을 가리킵니다: ${packageRef.packageName} (${licenseId})`,
      );
    }

    const customPath = path.join(packageRef.packageDir, normalized);
    if (!(await fsx.exists(customPath))) {
      throw new Error(`라이선스 파일을 찾을 수 없습니다: ${packageRef.packageName} (${licenseId})`);
    }
    return fsx.read(customPath);
  }

  for (const candidate of LICENSE_FILE_NAMES) {
    const licensePath = path.join(packageRef.packageDir, candidate);
    if (await fsx.exists(licensePath)) {
      return fsx.read(licensePath);
    }
  }

  return undefined;
}

/** 고지 파일에 기록할 패키지 1건 */
interface LicenseEntry {
  name: string;
  version: string | undefined;
  licenseId: string;
  licenseText: string | undefined;
}

/**
 * esbuild metafile 을 근거로 번들에 실제 포함된 제3자 패키지의 라이선스 고지문을 만든다.
 *
 * 트리셰이킹으로 잘려나가 산출물에 남지 않은 입력(`bytesInOutput` 이 0 이하)은 제외한다.
 * 같은 패키지의 같은 버전은 한 번만 기록한다.
 *
 * @param metafile esbuild 빌드 결과 metafile
 * @param rootDir metafile 의 상대 입력 경로를 절대 경로로 바꿀 기준 디렉터리 (esbuild 실행 작업 디렉터리)
 * @throws 라이선스를 알 수 없는 패키지가 하나라도 있을 때
 */
export async function extractLicenses(
  metafile: esbuild.Metafile,
  rootDir: string,
): Promise<string> {
  const seenInputPaths = new Set<string>();
  const seenPackageIds = new Set<string>();
  const entries: LicenseEntry[] = [];
  const unknownPackages: string[] = [];

  for (const output of Object.values(metafile.outputs)) {
    for (const [inputPath, { bytesInOutput }] of Object.entries(output.inputs)) {
      if (bytesInOutput <= 0) continue;
      if (seenInputPaths.has(inputPath)) continue;
      seenInputPaths.add(inputPath);

      const packageRef = resolvePackageRef(path.resolve(rootDir, inputPath));
      if (packageRef == null) continue;

      const manifestPath = path.join(packageRef.packageDir, "package.json");
      if (!(await fsx.exists(manifestPath))) {
        throw new Error(`패키지 정보를 찾을 수 없습니다: ${manifestPath} (입력: ${inputPath})`);
      }
      const manifest = await fsx.readJson<LicenseManifest>(manifestPath);

      const packageId = `${packageRef.packageName}@${manifest.version ?? ""}`;
      if (seenPackageIds.has(packageId)) continue;
      seenPackageIds.add(packageId);

      const licenseId = resolveLicenseId(manifest);
      if (licenseId == null) {
        unknownPackages.push(packageId);
        continue;
      }

      entries.push({
        name: manifest.name ?? packageRef.packageName,
        version: manifest.version,
        licenseId,
        licenseText: await readLicenseText(packageRef, licenseId),
      });
    }
  }

  if (unknownPackages.length > 0) {
    throw new Error(
      `라이선스를 알 수 없는 패키지가 있어 고지 파일을 만들 수 없습니다.\n` +
        unknownPackages
          .sort()
          .map((id) => `  - ${id}`)
          .join("\n"),
    );
  }

  entries.sort(
    (a, b) => a.name.localeCompare(b.name) || (a.version ?? "").localeCompare(b.version ?? ""),
  );

  let content = `${FILE_HEADER}\n\n${ENTRY_SEPARATOR}\n`;
  for (const entry of entries) {
    content += `Package: ${entry.name}${entry.version != null ? `@${entry.version}` : ""}\n`;
    content += `License: ${entry.licenseId}\n`;
    if (entry.licenseText != null) {
      content += `\n${entry.licenseText.trimEnd()}\n`;
    }
    content += `${ENTRY_SEPARATOR}\n`;
  }

  return content;
}
