import * as path from "path";
import { JsonConvert, StringUtil } from "@simplysm/sd-core-common";
import { File } from "@awesome-cordova-plugins/file";

/**
 * CordovaAppStorage provides methods to interact with the file system in a Cordova application.
 */
export class CordovaAppStorage {
  // static raw = File;

  /**
   * The URL of the root directory. This string represents the base URL
   * used for initiating requests or accessing the root directory resources.
   *
   * It is expected to be a valid URL and serves as a foundational reference
   * point for constructing other related URLs or paths within the application.
   *
   * Typical usage includes resolving resource locations relative to
   * the root directory, facilitating centralized configuration of base paths,
   * and ensuring consistency throughout the application's URL management.
   *
   * @type {string}
   */
  #rootDirectoryUrl: string;

  /**
   * Initializes a new instance of the class with an optional root directory.
   *
   * @param {string} [rootDirectory] - The root directory to be used. If not provided, defaults to the application's storage directory.
   * @return {Object} The newly created instance of the class.
   */
  constructor(rootDirectory?: string) {
    this.#rootDirectoryUrl = rootDirectory ?? File.applicationStorageDirectory;
  }

  /**
   * Reads and parses a JSON file asynchronously from the specified file path.
   *
   * @param {string} filePath - The path to the JSON file to be read.
   * @return {Promise<any>} A promise that resolves to the parsed JSON object, or undefined if the file is empty or null.
   */
  async readJsonAsync(filePath: string): Promise<any> {
    const fileStr = await this.readFileAsync(filePath);
    return StringUtil.isNullOrEmpty(fileStr) ? undefined : JsonConvert.parse(fileStr);
  }

  /**
   * Reads a file asynchronously and returns its content as a Buffer.
   *
   * @param {string} filePath - The path of the file to be read.
   * @return {Promise<Buffer | undefined>} A promise that resolves to a Buffer with the file content, or undefined if the file does not exist.
   */
  async readFileBufferAsync(filePath: string): Promise<Buffer | undefined> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    if (await this.exists(fullUrl)) {
      return Buffer.from(await File.readAsArrayBuffer(dirUrl, fileName));
    }
    else {
      return undefined;
    }
  }

  /**
   * Asynchronously reads the content of a file given its file path.
   *
   * @param filePath - The path to the file that needs to be read.
   * @return A promise that resolves with the file content as a string if the file exists,
   *         otherwise resolves with undefined if the file does not exist.
   */
  async readFileAsync(filePath: string): Promise<string | undefined> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    if (await this.exists(fullUrl)) {
      return await File.readAsText(dirUrl, fileName);
    }
    else {
      return undefined;
    }
  }

  /**
   * Writes data to a file in JSON format asynchronously.
   *
   * @param {string} filePath - The path to the file where the data will be written.
   * @param {any} data - The data to be written to the file.
   * @return {Promise<void>} A promise that resolves when the write operation is complete.
   */
  async writeJsonAsync(filePath: string, data: any) {
    await this.writeAsync(filePath, JsonConvert.stringify(data));
  }

  /**
   * Writes data to a file asynchronously.
   *
   * @param {string} filePath - The path to the file where the data will be written.
   * @param {(Blob | string | ArrayBuffer)} data - The data to be written to the file.
   * @return {Promise<void>} A promise that resolves when the write operation is complete.
   */
  async writeAsync(filePath: string, data: Blob | string | ArrayBuffer) {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    await this.#mkdirsAsync(path.dirname(filePath));

    await File.writeFile(dirUrl, fileName, data, { replace: true });
  }

  /**
   * Asynchronously reads the contents of a directory.
   *
   * @param {string} dirPath - The path to the directory.
   * @return {Promise<string[]>} A promise that resolves to an array containing the names of the files in the directory.
   */
  async readdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    const entries = await File.listDir(dirUrl, dirName);
    return entries.map((item) => item.name);
  }

  /**
   * Checks if a file or directory exists at the specified path.
   *
   * @param {string} targetPath - The path to check for existence.
   * @return {Promise<boolean>} A promise that resolves to true if the file or directory exists, and false otherwise.
   */
  async exists(targetPath: string) {
    const fullUrl = this.getFullUrl(targetPath);
    const dirUrl = path.dirname(fullUrl);
    const dirOrFileName = path.basename(fullUrl);

    try {
      const list = await File.listDir(path.dirname(dirUrl), path.basename(dirUrl));
      return list.some((item) => item.name === dirOrFileName);
    }
    catch {
      return false;
    }
  }

  /**
   * Removes a specified file or directory asynchronously.
   *
   * @param {string} dirOrFilePath - The path to the file or directory to be removed.
   * @return {Promise<void>} A promise that resolves when the file or directory has been removed.
   */
  async removeAsync(dirOrFilePath: string) {
    const fullUrl = this.getFullUrl(dirOrFilePath);
    const dirUrl = path.dirname(fullUrl);
    const dirOrFileName = path.basename(fullUrl);

    const list = await File.listDir(path.dirname(dirUrl), path.basename(dirUrl));
    const single = list.single((item) => item.name === dirOrFileName);
    if (!single) return;

    if (single.isDirectory) {
      await File.removeRecursively(dirUrl, dirOrFileName);
    }
    else {
      await File.removeFile(dirUrl, dirOrFileName);
    }
  }

  /**
   * Constructs the full URL by joining the root directory URL with the given target path.
   *
   * @param {string} targetPath - The target path to be appended to the root directory URL.
   * @return {string} - The full URL constructed by joining the root directory and target path.
   */
  getFullUrl(targetPath: string) {
    return path.join(this.#rootDirectoryUrl, targetPath);
  }

  /**
   * Asynchronously creates a new directory at the specified path.
   *
   * @param {string} dirPath - The path where the new directory will be created.
   * @return {Promise<void>} A promise that resolves when the directory is created.
   */
  async #mkdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    await File.createDir(dirUrl, dirName, true);
  }

  /**
   * Asynchronously creates a directory structure given a specific path.
   *
   * @param {string} dirPath - The path of the directories to be created.
   * @return {Promise<void>} A promise that resolves when the directories have been created.
   */
  async #mkdirsAsync(dirPath: string) {
    const dirs = dirPath.replace(/^\//, "").replace(/\/$/, "").split("/");

    let currDir = "";

    for (const dir of dirs) {
      currDir += dir;
      await this.#mkdirAsync(currDir);
      currDir += "/";
    }
  }
}
