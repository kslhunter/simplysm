import type { SdPackageConfig } from "../sd-config.types";

/**
 * 패키지명에서 watch scope 목록을 생성한다.
 * - 패키지명의 scope (예: "@myapp/root" → "@myapp")
 * - @simplysm (항상 포함)
 * @param packageName 루트 package.json의 name 필드
 * @returns scope 배열 (중복 제거)
 */
export function getWatchScopes(packageName: string): string[] {
  const scopes = new Set(["@simplysm"]);
  const match = packageName.match(/^(@[^/]+)\//);
  if (match != null) {
    scopes.add(match[1]);
  }
  return [...scopes];
}

/**
 * 패키지 결과 상태
 */
export interface PackageResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "success" | "error" | "server";
  message?: string;
  port?: number;
}

/**
 * 패키지 설정에서 targets 필터링 (scripts 타겟 제외)
 * @param packages 패키지 설정 맵
 * @param targets 필터링할 패키지 이름 목록. 빈 배열이면 scripts를 제외한 모든 패키지 반환
 * @returns 필터링된 패키지 설정 맵
 * @internal 테스트용으로 export
 */
export function filterPackagesByTargets(
  packages: Record<string, SdPackageConfig | undefined>,
  targets: string[],
): Record<string, SdPackageConfig> {
  const result: Record<string, SdPackageConfig> = {};

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;

    // scripts 타겟은 watch/dev 대상에서 제외
    if (config.target === "scripts") continue;

    // targets가 비어있으면 모든 패키지 포함
    if (targets.length === 0) {
      result[name] = config;
      continue;
    }

    // targets에 포함된 패키지만 필터링
    if (targets.includes(name)) {
      result[name] = config;
    }
  }

  return result;
}
