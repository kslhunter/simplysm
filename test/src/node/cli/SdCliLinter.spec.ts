import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { ESLint } from "eslint";

describe("(node) cli.SdCliLinter", () => {
  it("test", async () => {
    const rootPath = path.resolve(__dirname, "test-lint-project");

    await FsUtil.removeAsync(rootPath);
    await FsUtil.writeFileAsync(path.resolve(rootPath, "tsconfig-node.build.json"), `
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
    "target": "es2017",
    "lib": [
      "es2017"
    ]
  },
  "files": [
    "src/index.ts"
  ]
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, ".eslintrc.js"), `
module.exports = {
  overrides: [
    {
      files: ["*.ts"],
      extends: ["../../../../../packages/eslint-plugin/src/configs/typescript"],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "tsconfig-node.build.json"
      },
      settings: {
        "import/resolver": {
          typescript: {
            project: require("path").join(__dirname, "tsconfig-node.build.json")
          }
        }
      }
    }
  ]
};`.trim());


    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "index.ts"), `
import "./ext";
export * from "./Test";`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "ext.ts"), `
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Array {
  has(): boolean;
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test.ts"), `
export class Test {
  public get(): boolean {
    if ([].has()) {
      return true;
    }
    else {
      return false;
    }
  }
}`.trim());

    const linter = new ESLint({});
    const result = await linter.lintFiles([
      path.resolve(rootPath, "src", "index.ts"),
      path.resolve(rootPath, "src", "ext.ts"),
      path.resolve(rootPath, "src", "Test.ts")
    ]);
    console.log(2, result.mapMany((item) => item.messages.map((item1) => item1.message)));

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "ext.ts"), `
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Array {
  has1(): boolean;
}`.trim());

    await FsUtil.writeFileAsync(path.resolve(rootPath, "src", "Test.ts"), `
import "./";
export class Test {
  public get(): boolean {
    if ([].has1()) {
      return true;
    }
    else {
      return false;
    }
  }
}`.trim());

    const result1 = await linter.lintFiles([
      path.resolve(rootPath, "src", "Test.ts")
    ]);
    console.log(2, result1.mapMany((item) => item.messages.map((item1) => item1.message)));

    await FsUtil.removeAsync(rootPath);
  });
});