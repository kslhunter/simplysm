import { FsUtil } from "@simplysm/sd-core-node";

export class SdCliPrepare {
  public async prepareAsync(): Promise<void> {
    // 타입체크 속도 지연 메시지
    await this._modifyTypescriptCodeForTypeCheckPerformanceWarning();

    // ngcc 동시작업 관련: 대기시간 늘림
    await this._modifyNgccProcessorConfigurationCodeForLongWaitTime();

    // ngcc 동시작업 관련: 디버깅 메시지 끄기
    await this._modifyNgccProcessorAsyncLockerCodeForRemoveWaitingMessage();
  }

  private async _modifyTypescriptCodeForTypeCheckPerformanceWarning(): Promise<void> {
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
  }

  private async _modifyNgccProcessorConfigurationCodeForLongWaitTime(): Promise<void> {
    const filePath = require.resolve("@angular/compiler-cli/ngcc/src/packages/configuration.js");
    const fileContent = await FsUtil.readFileAsync(filePath);
    const modifiedFileContent = fileContent.replace(`
        locking: {
            retryDelay: 500,
            retryAttempts: 500,
        }`, `
        locking: {
            retryDelay: 1000,
            retryAttempts: 10 * 60,
        }`); // 10분
    await FsUtil.writeFileAsync(filePath, modifiedFileContent);
  }

  private async _modifyNgccProcessorAsyncLockerCodeForRemoveWaitingMessage(): Promise<void> {
    const filePath = require.resolve("@angular/compiler-cli/ngcc/src/locking/async_locker.js");
    const fileContent = await FsUtil.readFileAsync(filePath);
    const modifiedFileContent = fileContent.replace(`
                                this.logger.info("Another process, with id " + pid + ", is currently running ngcc.\\n" +
                                    ("Waiting up to " + this.retryDelay * this.retryAttempts / 1000 + "s for it to finish.\\n") +
                                    ("(If you are sure no ngcc process is running then you should delete the lock-file at " + this.lockFile.path + ".)"));`, ``);
    await FsUtil.writeFileAsync(filePath, modifiedFileContent);
  }
}
