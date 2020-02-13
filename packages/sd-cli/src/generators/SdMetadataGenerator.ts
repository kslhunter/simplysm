import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import * as ts from "typescript";
import {FsUtil} from "@simplysm/sd-core-node";
import * as path from "path";

export class SdMetadataGenerator {
  private readonly _cacheObj: { [key: string]: string } = {};
  private readonly _collector = new MetadataCollector();

  public constructor(private readonly _srcPath: string,
                     private readonly _distPath: string) {
  }

  public async generateAsync(sourceFile: ts.SourceFile): Promise<ts.Diagnostic[]> {
    const diagnostics: ts.Diagnostic[] = [];

    const metadata = this._collector.getMetadata(
      sourceFile,
      true,
      (value, tsNode) => {
        if (isMetadataError(value)) {
          diagnostics.push({
            file: sourceFile,
            start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
            messageText: value["message"],
            category: ts.DiagnosticCategory.Error,
            code: 0,
            length: undefined
          });
        }

        return value;
      }
    );


    const metadataFilePath = path.resolve(this._distPath, path.relative(this._srcPath, sourceFile.fileName))
      .replace(/\.ts$/, ".metadata.json");
    if (metadata) {
      const metadataJson = JSON.stringify(metadata);
      if (this._cacheObj[metadataFilePath] !== metadataJson) {
        this._cacheObj[metadataFilePath] = metadataJson;
        await FsUtil.writeFileAsync(metadataFilePath, metadataJson);
      }
    }
    else {
      delete this._cacheObj[metadataFilePath];
      await FsUtil.removeAsync(metadataFilePath);
    }

    return diagnostics;
  }
}