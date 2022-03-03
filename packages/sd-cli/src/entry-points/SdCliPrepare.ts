import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { fileURLToPath } from "url";

export class SdCliPrepare {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public async prepareAsync(): Promise<void> {
    // 타입체크 속도 지연 메시지 추가
    const r1 = await this._modifyTypescriptCodeForTypeCheckPerformanceWarning();
    this._logger.log(`[모듈수정] 타입체크 속도 지연 메시지 추가 (${r1 ? "O" : "X"})`);
  }

  private async _modifyTypescriptCodeForTypeCheckPerformanceWarning(): Promise<boolean> {
    const fileUrl = await import.meta.resolve!("typescript");
    const filePath = fileURLToPath(fileUrl);
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
                else if (usage.user + usage.system > 1000 * 1000 && node.kind !== 253) {
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
    return modifiedFileContent.includes("const prevUsage = process.cpuUsage();");
  }
}
