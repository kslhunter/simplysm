/**
 * ZIP file processing utility
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
 * ZIP archive processing class
 *
 * Handles reading, writing, compression, and decompression of ZIP files.
 * Uses internal caching to prevent duplicate decompression of the same file.
 *
 * @example
 * // Read ZIP file
 * await using archive = new ZipArchive(zipBytes);
 * const content = await archive.get("file.txt");
 *
 * @example
 * // Create ZIP file
 * await using archive = new ZipArchive();
 * archive.write("file.txt", textBytes);
 * archive.write("data.json", jsonBytes);
 * const zipBytes = await archive.compress();
 *
 * @example
 * // Extract all files (with progress reporting)
 * await using archive = new ZipArchive(zipBytes);
 * const files = await archive.extractAll((progress) => {
 *   console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
 * });
 */
export class ZipArchive {
  private readonly _reader?: ZipReader<Blob | Bytes>;
  private readonly _cache = new Map<string, Bytes | undefined>();
  private _entries?: Awaited<ReturnType<ZipReader<Blob | Bytes>["getEntries"]>>;

  /**
   * Create ZipArchive
   * @param data ZIP data (omit to create a new archive)
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
   * Extract all files
   * @param progressCallback Progress callback
   */
  async extractAll(
    progressCallback?: (progress: ZipArchiveProgress) => void,
  ): Promise<Map<string, Bytes | undefined>> {
    const entries = await this._getEntries();
    if (entries == null) return this._cache;

    // Calculate total size to extract
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

      // Accumulate when individual file completes
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
   * Extract specific file
   * @param fileName File name
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
   * Check if file exists
   * @param fileName File name
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
   * Write file (store in cache)
   * @param fileName File name
   * @param bytes File content
   */
  write(fileName: string, bytes: Bytes): void {
    this._cache.set(fileName, bytes);
  }
  //#endregion

  //#region compress
  /**
   * Compress cached files to ZIP
   *
   * @remarks
   * Internally calls `extractAll()` to load all files into memory before compressing.
   * Be mindful of memory usage when dealing with large ZIP files.
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
   * Close reader and clear cache
   */
  async close(): Promise<void> {
    await this._reader?.close();
    this._cache.clear();
  }

  /**
   * Support for await using
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
  //#endregion
}
