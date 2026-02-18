import type { Bytes } from "../common.types";
export interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
/**
 * ZIP 아카이브 처리 클래스
 *
 * ZIP 파일의 읽기, 쓰기, 압축/해제를 처리합니다.
 * 내부 캐시를 사용하여 동일 파일의 중복 압축 해제를 방지합니다.
 *
 * @example
 * // ZIP 파일 읽기
 * await using archive = new ZipArchive(zipBytes);
 * const content = await archive.getAsync("file.txt");
 *
 * @example
 * // ZIP 파일 생성
 * await using archive = new ZipArchive();
 * archive.write("file.txt", textBytes);
 * archive.write("data.json", jsonBytes);
 * const zipBytes = await archive.compressAsync();
 *
 * @example
 * // 전체 압축 해제 (진행률 표시)
 * await using archive = new ZipArchive(zipBytes);
 * const files = await archive.extractAllAsync((progress) => {
 *   console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
 * });
 */
export declare class ZipArchive {
  private readonly _reader?;
  private readonly _cache;
  private _entries?;
  /**
   * ZipArchive 생성
   * @param data ZIP 데이터 (생략 시 새 아카이브 생성)
   */
  constructor(data?: Blob | Bytes);
  private _getEntries;
  /**
   * 모든 파일을 압축 해제
   * @param progressCallback 진행률 콜백
   */
  extractAllAsync(
    progressCallback?: (progress: ZipArchiveProgress) => void,
  ): Promise<Map<string, Bytes | undefined>>;
  /**
   * 특정 파일 압축 해제
   * @param fileName 파일 이름
   */
  getAsync(fileName: string): Promise<Bytes | undefined>;
  /**
   * 파일 존재 여부 확인
   * @param fileName 파일 이름
   */
  existsAsync(fileName: string): Promise<boolean>;
  /**
   * 파일 쓰기 (캐시에 저장)
   * @param fileName 파일 이름
   * @param bytes 파일 내용
   */
  write(fileName: string, bytes: Bytes): void;
  /**
   * 캐시된 파일들을 ZIP으로 압축
   *
   * @remarks
   * 내부적으로 `extractAllAsync()`를 호출하여 모든 파일을 메모리에 로드한 후 압축합니다.
   * 대용량 ZIP 파일의 경우 메모리 사용량에 주의가 필요합니다.
   */
  compressAsync(): Promise<Bytes>;
  /**
   * 리더 닫기 및 캐시 정리
   */
  closeAsync(): Promise<void>;
  /**
   * await using 지원
   */
  [Symbol.asyncDispose](): Promise<void>;
}
//# sourceMappingURL=sd-zip.d.ts.map
