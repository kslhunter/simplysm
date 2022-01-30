import { FsUtil } from "@simplysm/sd-core-node";
import path from "path";
import { ESLint } from "eslint";
export class SdCliPackageLinter {
    constructor(_rootPath) {
        this._rootPath = _rootPath;
        this._lintResultCache = new Map();
    }
    async lintAsync(filePaths, program) {
        if (!FsUtil.exists(path.resolve(this._rootPath, ".eslintrc.cjs")))
            return [];
        const linter = new ESLint(program && filePaths.some((item) => item.endsWith(".ts")) ? {
            overrideConfig: {
                parserOptions: { program }
            }
        } : {});
        const lintFilePaths = await filePaths
            .filterAsync(async (filePath) => (!filePath.endsWith(".d.ts") &&
            !(await linter.isPathIgnored(filePath))));
        for (const lintFilePath of lintFilePaths) {
            this._lintResultCache.delete(lintFilePath);
        }
        const lintResults = await linter.lintFiles(lintFilePaths);
        const result = lintResults.map((lintResult) => ({
            filePath: lintResult.filePath,
            results: lintResult.messages.map((msg) => ({
                filePath: lintResult.filePath,
                line: msg.line,
                char: msg.column,
                code: msg.ruleId ?? undefined,
                severity: msg.severity === 1 ? "warning" : "error",
                message: msg.message
            }))
        }));
        for (const resultItem of result) {
            this._lintResultCache.set(resultItem.filePath, resultItem.results);
        }
        return Array.from(this._lintResultCache.values()).mapMany();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlQYWNrYWdlTGludGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2J1aWxkLXRvb2wvU2RDbGlQYWNrYWdlTGludGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNoRCxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUVoQyxNQUFNLE9BQU8sa0JBQWtCO0lBRzdCLFlBQW9DLFNBQWlCO1FBQWpCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFGcEMscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUM7SUFHbEYsQ0FBQztJQUVNLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBbUIsRUFBRSxPQUFvQjtRQUM5RCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUU3RSxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FDdkIsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUQsY0FBYyxFQUFFO2dCQUNkLGFBQWEsRUFBRSxFQUFFLE9BQU8sRUFBRTthQUMzQjtTQUNGLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDUCxDQUFDO1FBRUYsTUFBTSxhQUFhLEdBQUcsTUFBTSxTQUFTO2FBQ2xDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUMvQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQzNCLENBQUMsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FDeEMsQ0FBQyxDQUFDO1FBQ0wsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUU7WUFDeEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM1QztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUcxRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtZQUM3QixPQUFPLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtnQkFDN0IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2dCQUNkLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTTtnQkFDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLElBQUksU0FBUztnQkFDN0IsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFrQixDQUFDLENBQUMsQ0FBQyxPQUFnQjtnQkFDcEUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO2FBQ3JCLENBQUMsQ0FBQztTQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUosS0FBSyxNQUFNLFVBQVUsSUFBSSxNQUFNLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNwRTtRQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0NBQ0YifQ==