/**
 * 자동 업데이트 서비스 인터페이스
 *
 * 클라이언트 애플리케이션의 최신 버전 정보를 조회한다.
 */
export interface AutoUpdateService {
  /**
   * 지정된 플랫폼의 최신 버전 정보를 조회한다.
   * @param platform 대상 플랫폼 (예: "win32", "darwin", "linux")
   * @returns 최신 버전 정보. 버전이 없으면 undefined
   */
  getLastVersion(platform: string): Promise<
    | {
        version: string;
        downloadPath: string;
      }
    | undefined
  >;
}
