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
import "../extensions/array-ext";

export interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}

export class ZipArchive {
  private readonly _reader?: ZipReader<Blob | Uint8Array>;
  private readonly _cache = new Map<string, Uint8Array | undefined>();
  private _entries?: Awaited<ReturnType<ZipReader<Blob | Uint8Array>["getEntries"]>>;

  constructor(data?: Blob | Uint8Array) {
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

  //#region extractAllAsync
  /**
   * 모든 파일을 압축 해제
   * @param progressCallback 진행률 콜백
   */
  async extractAllAsync(
    progressCallback?: (progress: ZipArchiveProgress) => void,
  ): Promise<Map<string, Uint8Array | undefined>> {
    const entries = await this._getEntries();
    if (entries == null) return this._cache;

    // 압축 해제 대상 크기 총합 계산
    const totalSize = entries.filter((e) => !e.directory).sum((e) => e.uncompressedSize);

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

      // 개별 파일이 끝나면 누적 처리
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

  //#region getAsync
  /**
   * 특정 파일 압축 해제
   * @param fileName 파일 이름
   */
  async getAsync(fileName: string): Promise<Uint8Array | undefined> {
    if (this._cache.has(fileName)) {
      return this._cache.get(fileName);
    }

    const entries = await this._getEntries();
    if (entries == null) {
      this._cache.set(fileName, undefined);
      return undefined;
    }

    const entry = entries.single((item) => item.filename === fileName) as FileEntry | undefined;
    if (!entry) {
      this._cache.set(fileName, undefined);
      return undefined;
    }

    const bytes = await entry.getData(new Uint8ArrayWriter());
    this._cache.set(fileName, bytes);
    return bytes;
  }
  //#endregion

  //#region existsAsync
  /**
   * 파일 존재 여부 확인
   * @param fileName 파일 이름
   */
  async existsAsync(fileName: string): Promise<boolean> {
    if (this._cache.has(fileName)) {
      return true;
    }

    const entries = await this._getEntries();
    if (entries == null) {
      return false;
    }

    const entry = entries.single((item) => item.filename === fileName) as FileEntry | undefined;
    return entry !== undefined;
  }
  //#endregion

  //#region write
  /**
   * 파일 쓰기 (캐시에 저장)
   * @param fileName 파일 이름
   * @param bytes 파일 내용
   */
  write(fileName: string, bytes: Uint8Array): void {
    this._cache.set(fileName, bytes);
  }
  //#endregion

  //#region compressAsync
  /**
   * 캐시된 파일들을 ZIP으로 압축
   */
  async compressAsync(): Promise<Uint8Array> {
    const fileMap = await this.extractAllAsync();

    const writer = new ZipWriter(new Uint8ArrayWriter());

    for (const key of fileMap.keys()) {
      const fileBytes = fileMap.get(key);
      if (!fileBytes) continue;

      await writer.add(key, new Uint8ArrayReader(fileBytes));
    }

    return writer.close();
  }
  //#endregion

  //#region closeAsync
  /**
   * 리더 닫기 및 캐시 정리
   */
  async closeAsync(): Promise<void> {
    await this._reader?.close();
    this._cache.clear();
  }

  /**
   * await using 지원
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.closeAsync();
  }
  //#endregion
}
