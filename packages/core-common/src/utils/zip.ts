/**
 * ZIP 파일 처리 유틸리티
 */
import type { FileEntry } from "@zip.js/zip.js";
import {
  BlobReader,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";
import type { Bytes } from "../common.types";

export interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}

/**
 * ZIP 아카이브 처리 클래스
 *
 * ZIP 파일의 읽기, 쓰기, 압축, 해제를 처리.
 * 동일 파일의 중복 해제를 방지하기 위해 내부 캐싱 사용.
 *
 * @example
 * // ZIP 파일 읽기
 * const archive = new ZipArchive(zipBytes);
 * try {
 *   const content = await archive.get("file.txt");
 * } finally {
 *   await archive.close();
 * }
 *
 * @example
 * // ZIP 파일 생성
 * const archive = new ZipArchive();
 * try {
 *   archive.write("file.txt", textBytes);
 *   archive.write("data.json", jsonBytes);
 *   const zipBytes = await archive.compress();
 * } finally {
 *   await archive.close();
 * }
 *
 * @example
 * // 모든 파일 추출 (진행률 보고 포함)
 * const archive = new ZipArchive(zipBytes);
 * try {
 *   const files = await archive.extractAll((progress) => {
 *     console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
 *   });
 * } finally {
 *   await archive.close();
 * }
 */
export class ZipArchive {
  private readonly _reader?: ZipReader<Blob | Bytes>;
  private readonly _cache = new Map<string, Bytes | undefined>();
  private _entries?: Awaited<ReturnType<ZipReader<Blob | Bytes>["getEntries"]>>;

  /**
   * ZipArchive 생성
   * @param data ZIP 데이터 (생략하면 새 아카이브 생성)
   */
  constructor(data?: Blob | Bytes) {
    if (!data) return;

    if (data instanceof Uint8Array) {
      this._reader = new ZipReader(new Uint8ArrayReader(data));
    } else {
      this._reader = new ZipReader(new BlobReader(data));
    }
  }

  private async _getEntries() {
    if (this._entries == null && this._reader != null) {
      this._entries = await this._reader.getEntries();
    }
    return this._entries;
  }

  //#region extractAll
  /**
   * 모든 파일 추출
   * @param progressCallback 진행률 콜백
   */
  async extractAll(
    progressCallback?: (progress: ZipArchiveProgress) => void,
  ): Promise<Map<string, Bytes | undefined>> {
    const entries = await this._getEntries();
    if (entries == null) return this._cache;

    // 추출할 전체 크기 계산
    const totalSize = entries
      .filter((e) => !e.directory)
      .reduce((acc, e) => acc + e.uncompressedSize, 0);

    let totalExtracted = 0;
    for (const entry of entries) {
      if (entry.directory) continue;

      progressCallback?.({
        fileName: entry.filename,
        totalSize: totalSize,
        extractedSize: totalExtracted,
      });

      const entryBytes =
        this._cache.get(entry.filename) ??
        (await entry.getData(new Uint8ArrayWriter(), {
          onprogress: (extracted) => {
            const currentTotal = totalExtracted + extracted;

            progressCallback?.({
              fileName: entry.filename,
              totalSize: totalSize,
              extractedSize: currentTotal,
            });

            return undefined;
          },
        }));

      this._cache.set(entry.filename, entryBytes);

      // 개별 파일 완료 시 누적
      totalExtracted += entry.uncompressedSize;

      progressCallback?.({
        fileName: entry.filename,
        totalSize: totalSize,
        extractedSize: totalExtracted,
      });
    }

    return this._cache;
  }
  //#endregion

  //#region get
  /**
   * 특정 파일 추출
   * @param fileName 파일 이름
   */
  async get(fileName: string): Promise<Bytes | undefined> {
    if (this._cache.has(fileName)) {
      return this._cache.get(fileName);
    }

    const entries = await this._getEntries();
    if (entries == null) {
      this._cache.set(fileName, undefined);
      return undefined;
    }

    const entry = entries.find((item) => item.filename === fileName) as FileEntry | undefined;
    if (!entry) {
      this._cache.set(fileName, undefined);
      return undefined;
    }

    const bytes = await entry.getData(new Uint8ArrayWriter());
    this._cache.set(fileName, bytes);
    return bytes;
  }
  //#endregion

  //#region exists
  /**
   * 파일 존재 여부 확인
   * @param fileName 파일 이름
   */
  async exists(fileName: string): Promise<boolean> {
    if (this._cache.has(fileName)) {
      return this._cache.get(fileName) != null;
    }

    const entries = await this._getEntries();
    if (entries == null) {
      return false;
    }

    const entry = entries.find((item) => item.filename === fileName) as FileEntry | undefined;
    return entry !== undefined;
  }
  //#endregion

  //#region write
  /**
   * 파일 쓰기 (캐시에 저장)
   * @param fileName 파일 이름
   * @param bytes 파일 내용
   */
  write(fileName: string, bytes: Bytes): void {
    this._cache.set(fileName, bytes);
  }
  //#endregion

  //#region compress
  /**
   * 캐시된 파일을 ZIP으로 압축
   *
   * @remarks
   * 내부적으로 `extractAll()`을 호출하여 모든 파일을 메모리에 로드한 후 압축.
   * 대용량 ZIP 파일 처리 시 메모리 사용량에 주의.
   */
  async compress(): Promise<Bytes> {
    const fileMap = await this.extractAll();

    const writer = new ZipWriter(new Uint8ArrayWriter());

    for (const key of fileMap.keys()) {
      const fileBytes = fileMap.get(key);
      if (!fileBytes) continue;

      await writer.add(key, new Uint8ArrayReader(fileBytes));
    }

    return writer.close();
  }
  //#endregion

  //#region close
  /**
   * 리더 닫기 및 캐시 비우기
   */
  async close(): Promise<void> {
    await this._reader?.close();
    this._cache.clear();
  }

  //#endregion
}
