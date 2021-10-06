import { FsUtil, Logger } from "@simplysm/sd-core-node";
import * as path from "path";
import { SdCliTsProgramWatcher } from "@simplysm/sd-cli";
import { Wait } from "@simplysm/sd-core-common";

describe("(node) cli.SdCliTsProgramWatcher", () => {
  it("test", async () => {
    const rootPath = path.resolve(__dirname, "test-project");

    await FsUtil.removeAsync(rootPath);
    await FsUtil.writeFileAsync(path.resolve(rootPath, "sd-tsconfig.node.json"), `
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "suppressImplicitAnyIndexErrors": true,
    "sourceMap": true,
    "removeComments": true,
    "noUnusedLocals": true,
    "importHelpers": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "declaration": true,
    "typeRoots": [
      "../../../../../node_modules/@types",
      "../../../../../node_modules/@simplysm-types"
    ],
    "outDir": "./dist/node",
    "declarationDir": "./dist/types",
    "target": "es2020",
    "lib": [
      "es2020"
    ]
  },
  "files": [
    "src/index.ts"
  ]
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "index.ts"), `
import "./Test1";
import * as test3 from "./Test3";
import { Test2 } from "./Test2";
export * from "./Test";
export { Test6 } from "./Test5";
export { Test2 };
export { Test99 } from "./Test99";`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test.ts"), `
import "./Test1";
export class Test {
}
export class Test4 {
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test1.ts"), `
export class Test1 {
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test2.ts"), `
export class Test2 {
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test3.ts"), `
export class Test3 {
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test5.ts"), `
export class Test5 {
}
export class Test6 {
}`.trim());

    const logger = Logger.get(["node", "cli", "SdCliTsProgramWatcher"]);

    let count = 0;
    const watcher = new SdCliTsProgramWatcher(rootPath, "node", false, logger);
    await watcher.watchAsync((program, changeInfos) => {
      if (count > 0) {
        console.log(changeInfos);
      }
      count++;
    });

    console.log("add Test7");
    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test7.ts"), `
export class Test7 {
}`.trim());

    await Wait.time(500);

    console.log("mod index.ts");
    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "index.ts"), `
import "./Test1";
import * as test3 from "./Test3";
import { Test2 } from "./Test2";
export * from "./Test";
export { Test6 } from "./Test5";
export { Test2 };
export { Test99 } from "./Test99";
export { Test7 } from "./Test7";`.trim());

    await Wait.time(500);

    console.log("remove Test7");
    await FsUtil.removeAsync(path.resolve(rootPath, "src", "Test7.ts"));

    await Wait.true(() => count > 2);

    await FsUtil.removeAsync(rootPath);
  });
});
