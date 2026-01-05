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
import "../extensions/array.ext.js";

export interface ISdZipProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}

export class SdZip {
  private readonly _reader?: ZipReader<Blob | Buffer>;
  private readonly _cache = new Map<string, Buffer | undefined>();

  constructor(data?: Blob | Buffer) {
    if (!data) return;

    if (Buffer.isBuffer(data)) {
      const uint8Array = new Uint8Array(data);
      this._reader = new ZipReader(new Uint8ArrayReader(uint8Array));
    } else {
      this._reader = new ZipReader(new BlobReader(data));
    }
  }

  //#region extractAllAsync
  /**
   * 모든 파일을 압축 해제
   * @param progressCallback 진행률 콜백
   */
  async extractAllAsync(
    progressCallback?: (progress: ISdZipProgress) => void,
  ): Promise<Map<string, Buffer | undefined>> {
    if (!this._reader) return this._cache;

    const entries = await this._reader.getEntries();

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

      const entryBuffer =
        this._cache.get(entry.filename) ??
        Buffer.from(
          await entry.getData(new Uint8ArrayWriter(), {
            onprogress: (extracted) => {
              const currentTotal = totalExtracted + extracted;

              progressCallback?.({
                fileName: entry.filename,
                totalSize: totalSize,
                extractedSize: currentTotal,
              });

              return undefined;
            },
          }),
        );

      this._cache.set(entry.filename, entryBuffer);

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
  async getAsync(fileName: string): Promise<Buffer | undefined> {
    if (this._cache.has(fileName)) {
      return this._cache.get(fileName);
    }

    if (!this._reader) {
      this._cache.set(fileName, undefined);
      return undefined;
    }

    const entries = await this._reader.getEntries();

    const entry = entries.single((item) => item.filename === fileName) as FileEntry | undefined;
    if (!entry) {
      this._cache.set(fileName, undefined);
      return undefined;
    }

    const bytes = await entry.getData(new Uint8ArrayWriter());
    const buffer = Buffer.from(bytes);
    this._cache.set(fileName, buffer);
    return buffer;
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

    if (!this._reader) {
      return false;
    }

    const entries = await this._reader.getEntries();
    const entry = entries.single((item) => item.filename === fileName) as FileEntry | undefined;
    return entry !== undefined;
  }
  //#endregion

  //#region write
  /**
   * 파일 쓰기 (캐시에 저장)
   * @param fileName 파일 이름
   * @param buffer 파일 내용
   */
  write(fileName: string, buffer: Buffer): void {
    this._cache.set(fileName, buffer);
  }
  //#endregion

  //#region compressAsync
  /**
   * 캐시된 파일들을 ZIP으로 압축
   */
  async compressAsync(): Promise<Buffer> {
    const fileMap = await this.extractAllAsync();

    const writer = new ZipWriter(new Uint8ArrayWriter());

    for (const key of fileMap.keys()) {
      const fileBuffer = fileMap.get(key);
      if (!fileBuffer) continue;

      const bytes = new Uint8Array(fileBuffer);
      await writer.add(key, new Uint8ArrayReader(bytes));
    }

    return Buffer.from(await writer.close());
  }
  //#endregion

  //#region closeAsync
  /**
   * 리더 닫기
   */
  async closeAsync(): Promise<void> {
    await this._reader?.close();
  }
  //#endregion
}
