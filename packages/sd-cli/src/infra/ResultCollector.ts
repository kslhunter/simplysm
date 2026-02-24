/**
 * 빌드 결과 상태
 */
export interface BuildResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "pending" | "building" | "success" | "error" | "running";
  message?: string;
  port?: number;
}

/**
 * 빌드 결과를 수집하고 관리하는 클래스
 *
 * 여러 Builder에서 발생하는 빌드 결과를 중앙에서 관리하고,
 * 상태별 필터링 및 출력 기능을 제공한다.
 */
export class ResultCollector {
  private readonly _results = new Map<string, BuildResult>();

  /**
   * 결과 추가
   * @param result 빌드 결과
   */
  add(result: BuildResult): void {
    const key = `${result.name}:${result.type}`;
    this._results.set(key, result);
  }

  /**
   * 키로 결과 조회
   * @param key 결과 키 (예: "core-common:build")
   */
  get(key: string): BuildResult | undefined {
    return this._results.get(key);
  }

  /**
   * 내부 Map 반환 (하위 호환성)
   */
  toMap(): Map<string, BuildResult> {
    return this._results;
  }
}
