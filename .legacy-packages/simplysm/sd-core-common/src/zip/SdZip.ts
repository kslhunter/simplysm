import type { FileEntry } from "@zip.js/zip.js";
import {
  BlobReader,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";

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

  async extractAllAsync(progressCallback?: (progress: IProgress) => void) {
    if (!this._reader) return this._cache;

    const entries = await this._reader.getEntries();

    // 1. 압축 해제 대상 크기 총합 계산
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

      // 3. 개별 파일이 끝나면 누적 처리
      totalExtracted += entry.uncompressedSize;

      progressCallback?.({
        fileName: entry.filename,
        totalSize: totalSize,
        extractedSize: totalExtracted,
      });
    }

    return this._cache;
  }

  async getAsync(fileName: string) {
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
    return Buffer.from(bytes);
  }

  async existsAsync(fileName: string) {
    if (this._cache.has(fileName)) {
      return true;
    }

    if (!this._reader) {
      return false;
    }

    const entries = await this._reader.getEntries();
    const entry = entries.single((item) => item.filename === fileName) as FileEntry | undefined;
    return !!entry;
  }

  write(fileName: string, buffer: Buffer) {
    this._cache.set(fileName, buffer);
  }

  async compressAsync() {
    const fileMap = await this.extractAllAsync();

    const writer = new ZipWriter(new Uint8ArrayWriter());

    for (const key of fileMap.keys()) {
      const bytes = new Uint8Array(fileMap.get(key)!);
      await writer.add(key, new Uint8ArrayReader(bytes));
    }

    return Buffer.from(await writer.close());
  }

  async closeAsync() {
    await this._reader?.close();
  }
}

interface IProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
