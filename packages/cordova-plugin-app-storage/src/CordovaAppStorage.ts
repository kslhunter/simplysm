import * as path from "path";
import { JsonConvert, StringUtil } from "@simplysm/sd-core-common";
import { File } from "@awesome-cordova-plugins/file";

/**
 * 코르도바 앱의 로컬 저장소를 관리하는 클래스
 * 
 * @remarks
 * - 앱의 로컬 저장소에 파일을 읽고 쓸 수 있는 기능을 제공합니다.
 * - JSON 데이터와 일반 파일을 모두 지원합니다.
 * - {@link File} 플러그인을 사용하여 파일 시스템에 접근합니다.
 * 
 * @example
 * ```ts
 * const storage = new CordovaAppStorage();
 * 
 * // JSON 파일 쓰기
 * await storage.writeJsonAsync("/data/config.json", { setting: "value" });
 * 
 * // JSON 파일 읽기 
 * const config = await storage.readJsonAsync("/data/config.json");
 * 
 * // 일반 파일 쓰기
 * await storage.writeAsync("/files/doc.txt", "Hello World");
 * 
 * // 일반 파일 읽기
 * const content = await storage.readFileAsync("/files/doc.txt");
 * ```
 */
export class CordovaAppStorage {
  /**
   * 앱 저장소의 루트 디렉토리 URL
   */
  #rootDirectoryUrl: string;

  /**
   * CordovaAppStorage 클래스의 생성자
   * @param rootDirectory 루트 디렉토리 경로. 지정하지 않으면 앱의 기본 저장소 디렉토리를 사용
   */
  constructor(rootDirectory?: string) {
    this.#rootDirectoryUrl = rootDirectory ?? File.applicationStorageDirectory;
  }

  /**
   * JSON 파일을 읽어서 객체로 반환
   * @param filePath 파일 경로
   * @returns 파일 내용을 파싱한 객체. 파일이 없거나 비어있으면 undefined 반환
   */
  async readJsonAsync(filePath: string): Promise<any> {
    const fileStr = await this.readFileAsync(filePath);
    return StringUtil.isNullOrEmpty(fileStr) ? undefined : JsonConvert.parse(fileStr);
  }

  /**
   * 파일을 Buffer로 읽기
   * @param filePath 파일 경로
   * @returns 파일 내용을 담은 Buffer. 파일이 없으면 undefined 반환
   */
  async readFileBufferAsync(filePath: string): Promise<Buffer | undefined> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    if (await this.exists(filePath)) {
      return Buffer.from(await File.readAsArrayBuffer(dirUrl, fileName));
    }
    else {
      return undefined;
    }
  }

  /**
   * 파일을 문자열로 읽기
   * @param filePath 파일 경로
   * @returns 파일 내용 문자열. 파일이 없으면 undefined 반환
   */
  async readFileAsync(filePath: string): Promise<string | undefined> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    if (await this.exists(filePath)) {
      return await File.readAsText(dirUrl, fileName);
    }
    else {
      return undefined;
    }
  }

  /**
   * 객체를 JSON 형식으로 파일에 쓰기
   * @param filePath 파일 경로
   * @param data 저장할 객체
   */
  async writeJsonAsync(filePath: string, data: any) {
    await this.writeAsync(filePath, JsonConvert.stringify(data));
  }

  /**
   * 데이터를 파일에 쓰기
   * @param filePath 파일 경로
   * @param data 저장할 데이터 (Blob, 문자열 또는 ArrayBuffer)
   */
  async writeAsync(filePath: string, data: Blob | string | ArrayBuffer) {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    await this.#mkdirsAsync(path.dirname(filePath));

    await File.writeFile(dirUrl, fileName, data, { replace: true });
  }

  /**
   * 디렉토리 내용 읽기
   * @param dirPath 디렉토리 경로
   * @returns 디렉토리 내 파일/폴더 이름 목록
   */
  async readdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    const entries = await File.listDir(dirUrl, dirName);
    return entries.map((item) => item.name);
  }

  /**
   * 파일/디렉토리 존재 여부 확인
   * @param targetPath 대상 경로
   * @returns 존재하면 true, 없으면 false
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
   * 파일/디렉토리 삭제
   * @param dirOrFilePath 삭제할 파일/디렉토리 경로
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
   * 상대 경로를 전체 URL로 변환
   * @param targetPath 상대 경로
   * @returns 전체 URL
   */
  getFullUrl(targetPath: string) {
    return path.join(this.#rootDirectoryUrl, targetPath);
  }
  
  /**
   * 상대 경로를 전체 파일시스템 경로로 변환
   * @param targetPath 상대 경로
   * @returns 전체 파일시스템 경로
   */
  getFullPath(targetPath: string) {
    return this.getFullUrl(targetPath).replace(/^file:/, "");
  }

  /**
   * 디렉토리 생성
   * @param dirPath 생성할 디렉토리 경로
   */
  async #mkdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    await File.createDir(dirUrl, dirName, true);
  }

  /**
   * 중첩 디렉토리 생성
   * @param dirPath 생성할 디렉토리 경로
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
