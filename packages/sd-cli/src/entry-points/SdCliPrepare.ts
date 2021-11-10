import { FsUtil } from "@simplysm/sd-core-node";

export class SdCliPrepare {
  public async prepareAsync(): Promise<void> {
    await this._modifyTypescriptCodeForTypeCheckPerformanceWarning();
  }

  private async _modifyTypescriptCodeForTypeCheckPerformanceWarning(): Promise<void> {
    const entryFileContent = await FsUtil.readFileAsync(require.resolve("typescript"));
    const newEntryFileContent = entryFileContent.replace(`
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
    await FsUtil.writeFileAsync(require.resolve("typescript"), newEntryFileContent);
  }
}
