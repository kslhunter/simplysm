import { FsUtil, Logger } from "@simplysm/sd-core-node";

export class SdCliPrepare {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public async prepareAsync(): Promise<void> {
    // 타입체크 속도 지연 메시지 추가
    const r1 = await this._modifyTypescriptCodeForTypeCheckPerformanceWarning();
    this._logger.log(`[모듈수정] 1. 타입체크 속도 지연 메시지 추가 (${r1 ? "O" : "X"})`);

    // ngcc 동시작업 관련: ng-packagr 무조건 Async
    const r2 = await this._modifyNgccProcessorNgPackagrCodeForAsync();
    this._logger.log(`[모듈수정] 2. ngcc: 비동기 처리 (${r2 ? "O" : "X"})`);

    // ngcc 동시작업 관련: 대기시간 늘림
    const r3 = await this._modifyNgccProcessorConfigurationCodeForLongWaitTime();
    this._logger.log(`[모듈수정] 3. ngcc: 대기시간 늘림 (${r3 ? "O" : "X"})`);

    // ngcc 동시작업 관련: 디버깅 메시지 끄기
    const r4 = await this._modifyNgccProcessorAsyncLockerCodeForRemoveWaitingMessage();
    this._logger.log(`[모듈수정] 3. ngcc: 불필요 메시지 제거 (${r4 ? "O" : "X"})`);
  }

  private async _modifyTypescriptCodeForTypeCheckPerformanceWarning(): Promise<boolean> {
    const filePath = require.resolve("typescript");
    const fileContent = await FsUtil.readFileAsync(filePath);
    const modifiedFileContent = fileContent.replace(`
        function checkSourceElement(node) {
            if (node) {
                var saveCurrentNode = currentNode;
                currentNode = node;
                instantiationCount = 0;
                checkSourceElementWorker(node);
                currentNode = saveCurrentNode;
            }
        }`, `
        function checkSourceElement(node) {
            if (node) {
                const prevUsage = process.cpuUsage();

                var saveCurrentNode = currentNode;
                currentNode = node;
                instantiationCount = 0;
                checkSourceElementWorker(node);
                currentNode = saveCurrentNode;

                const usage = process.cpuUsage(prevUsage);
                if (node.hasChildPerformanceWarning) {
                    node.parent.hasChildPerformanceWarning = true;
                }
                else if (usage.user + usage.system > 2000 * 1000 && node.kind !== 253) {
                    error(node, {
                        code: 9000,
                        category: ts.DiagnosticCategory.Warning,
                        key: "simplysm_check_source_element_performance_slow",
                        message: "소스코드 타입분석에 너무 오랜 시간이 소요됩니다. [" + Math.round((usage.user + usage.system) / 1000) + "ms/cpu, KIND: " + node.kind + "]"
                    });
                    node.parent.hasChildPerformanceWarning = true;
                }
            }
        }`);
    await FsUtil.writeFileAsync(filePath, modifiedFileContent);
    return fileContent !== modifiedFileContent;
  }

  private async _modifyNgccProcessorNgPackagrCodeForAsync(): Promise<boolean> {
    const filePath = require.resolve("ng-packagr/lib/ngc/ngcc-processor.js");
    const fileContent = await FsUtil.readFileAsync(filePath);
    const modifiedFileContent = fileContent.replace(`
        ngcc_1.process({
            basePath: this._nodeModulesDirectory`, `
        ngcc_1.process({
            async: true,
            basePath: this._nodeModulesDirectory`); // 10분
    await FsUtil.writeFileAsync(filePath, modifiedFileContent);
    return fileContent !== modifiedFileContent;
  }

  private async _modifyNgccProcessorConfigurationCodeForLongWaitTime(): Promise<boolean> {
    const filePath = require.resolve("@angular/compiler-cli/ngcc/src/packages/configuration.js");
    const fileContent = await FsUtil.readFileAsync(filePath);
    const modifiedFileContent = fileContent.replace(`
        locking: {
            retryDelay: 500,
            retryAttempts: 500`, `
        locking: {
            retryDelay: 1000,
            retryAttempts: 10 * 60`); // 10분
    await FsUtil.writeFileAsync(filePath, modifiedFileContent);
    return fileContent !== modifiedFileContent;
  }

  private async _modifyNgccProcessorAsyncLockerCodeForRemoveWaitingMessage(): Promise<boolean> {
    const filePath = require.resolve("@angular/compiler-cli/ngcc/src/locking/async_locker.js");
    const fileContent = await FsUtil.readFileAsync(filePath);
    const modifiedFileContent = fileContent.replace(`
                                this.logger.info("Another process, with id " + pid + ", is currently running ngcc.\\n" +
                                    ("Waiting up to " + this.retryDelay * this.retryAttempts / 1000 + "s for it to finish.\\n") +
                                    ("(If you are sure no ngcc process is running then you should delete the lock-file at " + this.lockFile.path + ".)"));`, ``);
    await FsUtil.writeFileAsync(filePath, modifiedFileContent);
    return fileContent !== modifiedFileContent;
  }
}
