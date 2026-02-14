/**
 * 파일 업로드 결과
 *
 * 서버에 업로드된 파일의 정보를 담는다.
 */
export interface ServiceUploadResult {
  /** 서버 내 저장 경로 */
  path: string;
  /** 원본 파일명 */
  filename: string;
  /** 파일 크기 (bytes) */
  size: number;
}
