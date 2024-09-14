import path from "path";
import fs from "node:fs";
import { glob } from "glob";

const srcGlobPath = path.posix.resolve("packages/sd-angular/src/**/*.ts");
console.log(srcGlobPath);

/*const replaces = [
  [/shared(.*): IEmployeeSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("직원");`],
  [/shared(.*): IPartnerSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("거래처");`],
  [/shared(.*): IDeliverySharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("납품처");`],
  [/shared(.*): IGoodsSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("품목");`],
  [/shared(.*): IGoodsCategorySharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("품목분류");`],
  [/shared(.*): IGoodsUnitSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("품목단위");`],
  [/shared(.*): IPayrollSubjectSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("급여과목");`],
  [/shared(.*): IShelfSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("선반");`],
  [/shared(.*): IToxicChemicalSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("독성물질");`],

  [/shared(.*): IShelfRangeForPartnerSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("거래처별선반범위");`],

  [/shared(.*): IProjectSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("프로젝트");`],
  [/shared(.*): IProjectMilestoneSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("마일스톤");`],
  [/shared(.*): IProjectTaskStatusSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("작업상태");`],
  [/shared(.*): IProjectTaskCategorySharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("작업분류");`],
  [/shared(.*): IProjectTaskLabelSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("작업라벨");`],

  [/shared(.*): IBizPlaceSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("사업장");`],
  [/shared(.*): IBankAccountSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("계좌");`],
  [/shared(.*): IPaymentCardSharedData\[] = \[];/g, `shared$1 = this.#appSharedData.getSignal("카드");`],

  [/shared(.*) = new Map<.*, IEmployeeSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("직원");`],
  [/shared(.*) = new Map<.*, IPartnerSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("거래처");`],
  [/shared(.*) = new Map<.*, IDeliverySharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("납품처");`],
  [/shared(.*) = new Map<.*, IGoodsSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("품목");`],
  [/shared(.*) = new Map<.*, IGoodsCategorySharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("품목분류");`],
  [/shared(.*) = new Map<.*, IGoodsUnitSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("품목단위");`],
  [/shared(.*) = new Map<.*, IPayrollSubjectSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("급여과목");`],
  [/shared(.*) = new Map<.*, IShelfSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("선반");`],
  [/shared(.*) = new Map<.*, IToxicChemicalSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("독성물질");`],

  [/shared(.*) = new Map<.*, IShelfRangeForPartnerSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("거래처별선반범위");`],

  [/shared(.*) = new Map<.*, IProjectSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("프로젝트");`],
  [/shared(.*) = new Map<.*, IProjectMilestoneSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("마일스톤");`],
  [/shared(.*) = new Map<.*, IProjectTaskStatusSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("작업상태");`],
  [/shared(.*) = new Map<.*, IProjectTaskCategorySharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("작업분류");`],
  [/shared(.*) = new Map<.*, IProjectTaskLabelSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("작업라벨");`],

  [/shared(.*) = new Map<.*, IBizPlaceSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("사업장");`],
  [/shared(.*) = new Map<.*, IBankAccountSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("계좌");`],
  [/shared(.*) = new Map<.*, IPaymentCardSharedData>\(\);/g, `shared$1 = this.#appSharedData.getMapSignal("카드");`],

  [/\n +this\.shared.* = this\.#appData\.getSignal\(".*"\)\(\);/g, ""],
  [/\n +this\.shared.* = this\.#appData\.getMapSignal\(".*"\)\(\);/g, ""],

  [/\[itemOf]="shared([^"()]*)"/g, `[itemOf]="shared$1()"`],
  [/\[items]="shared([^"()]*)"/g, `[items]="shared$1()"`]
];

for (const srcPath of glob.sync(srcGlobPath)) {
  let contents = fs.readFileSync(srcPath, "utf-8");
  const prevContents = contents;
  for (const replace of replaces) {
    contents = contents.replaceAll(replace[0], replace[1]);
  }

  if (prevContents !== contents) {
    fs.writeFileSync(srcPath, contents);
  }
}*/

/*
const messages = [];
for (const srcPath of glob.sync(srcGlobPath)) {
  let contents = fs.readFileSync(srcPath, "utf-8");

  // inject sharedData
  if (
    contents.includes("this.#appSharedData") &&
    !contents.includes("#appSharedData = ")
  ) {
    const line = contents.split("\n").findIndex(item => item.includes("inject("));

    messages.push(`${srcPath}(${line}, 0): appSharedData`);
  }

  // sharedData usage
  {
    const line = contents.split("\n").findIndex(item => /this\.shared([^\n() ]*)\n? *\./.test(item)) + 1;
    if (line > 0) {
      messages.push(`${srcPath}(${line}, 0): sharedData`);
    }
  }

  // formatPipe
  if (
    contents.includes(" | format:") &&
    !contents.includes("FormatPipe")
  ) {
    const line = contents.split("\n").findIndex(item => item.includes("imports: [")) + 1;

    messages.push(`${srcPath}(${line}, 0): formatPipe`);
  }
}

console.error(messages.map((item, index) => `${item}[${index}]`).join("\n"));*/

const messages = [];
for (const srcPath of glob.sync(srcGlobPath)) {
  let contents = fs.readFileSync(srcPath, "utf-8");
  // const prevContents = contents;

  const templateMatch = contents.match(/template: `([^`]*)`/);
  if (!templateMatch) {
    continue;
  }

  const templateRange = [templateMatch.index, templateMatch.index + templateMatch[1].length];

  //-- 임포트 (@simplysm/sd-angular)
  // patch
  // const sdAngularImportsMatch = contents.match(/import \{([^}]*)} from "@simplysm\/sd-angular";/);
  // const sdAngularImports = sdAngularImportsMatch?.[1].split(",").map((item) => item.trim());

  //-- 임포트 (@angular/core)
  /*const angularCoreImportsMatch = contents.match(/import \{([^}]*)} from "@angular\/core";/);
  const angularCoreImports = angularCoreImportsMatch?.[1].split(",").map((item) => item.trim());
  if (/= signal[<(]/.test(contents) && !angularCoreImports?.includes("signal")) {
    const pos = getMatchPosition(contents, angularCoreImportsMatch?.index);
    if (angularCoreImportsMatch) {
      contents = stringInsert(contents, angularCoreImportsMatch.index + 8, "signal,");
    }
    messages.push(`${srcPath}(${pos.line}, ${pos.char}): signal: 임포트`);
  }

  if (/= computed[<(]/.test(contents) && !angularCoreImports?.includes("computed")) {
    const pos = getMatchPosition(contents, angularCoreImportsMatch?.index);
    if (angularCoreImportsMatch) {
      contents = stringInsert(contents, angularCoreImportsMatch.index + 8, "computed,");
    }
    messages.push(`${srcPath}(${pos.line}, ${pos.char}): computed: 임포트`);
  }

  if (/= input[<(]/.test(contents) && !angularCoreImports?.includes("input")) {
    const pos = getMatchPosition(contents, angularCoreImportsMatch?.index);
    if (angularCoreImportsMatch) {
      contents = stringInsert(contents, angularCoreImportsMatch.index + 8, "input,");
    }
    messages.push(`${srcPath}(${pos.line}, ${pos.char}): input: 임포트`);
  }

  if (/= model[<(]/.test(contents) && !angularCoreImports?.includes("model")) {
    const pos = getMatchPosition(contents, angularCoreImportsMatch?.index);
    if (angularCoreImportsMatch) {
      contents = stringInsert(contents, angularCoreImportsMatch.index + 8, "model,");
    }
    messages.push(`${srcPath}(${pos.line}, ${pos.char}): model: 임포트`);
  }*/

  //-- 시그널 사용
  const signalNames = Array.from(contents.matchAll(/ {2}([A-z]*) = (signal|model|input|computed)/g)).map(
    (item) => item[1],
  );

  for (const signalName of signalNames) {
    // 시그널 괄호 (템플릿)
    {
      const regexpString = `${signalName}(?!(\\(|\\.set|\\.update| =))\\.`;
      const matchedIndex = contents.slice(...templateRange).match(regexpString)?.index;

      if (matchedIndex) {
        const line = Array.from(contents.slice(0, matchedIndex + templateRange[0]).matchAll(/\n/g)).length + 1;
        const char = matchedIndex + templateRange[0] - contents.slice(0, matchedIndex + templateRange[0]).lastIndexOf("\n");

        messages.push(`${srcPath}(${line}, ${char}): ${signalName}: 시그널 괄호 (템플릿)`);
      }
    }

    // 시그널 괄호 (this.)
    {
      const regexpString = `this\\.${signalName}(?!(\\(|\\.set|\\.update| =))\\.`;
      const matchedIndex = contents.match(regexpString)?.index;

      if (matchedIndex) {
        const line = Array.from(contents.slice(0, matchedIndex).matchAll(/\n/g)).length + 1;
        const char = matchedIndex - contents.slice(0, matchedIndex).lastIndexOf("\n");

        messages.push(`${srcPath}(${line}, ${char}): ${signalName}: 시그널 괄호`);
      }
    }

    // 시그널 내 데이터 변경 (=)
    {
      const regexpString = `this\\.${signalName}\\(\\)\\.[A-z.\\[\\]"]* =[^=]`;
      const matchedIndex = contents.match(regexpString)?.index;

      if (matchedIndex) {
        const line = Array.from(contents.slice(0, matchedIndex).matchAll(/\n/g)).length + 1;
        const char = matchedIndex - contents.slice(0, matchedIndex).lastIndexOf("\n");

        messages.push(`${srcPath}(${line}, ${char}): ${signalName}: 시그널내 데이터 변경`);
      }
    }
  }

  // 템플릿에  this.
  {
    const matchedIndex = contents.slice(...templateRange).match(/this\./)?.index;

    if (matchedIndex) {
      const line = Array.from(contents.slice(0, matchedIndex + templateRange[0]).matchAll(/\n/g)).length + 1;
      const char = matchedIndex + templateRange[0] - contents.slice(0, matchedIndex + templateRange[0]).lastIndexOf("\n");

      messages.push(`${srcPath}(${line}, ${char}): 템플릿에  this.`);
    }
  }

  // 템플릿에  [(...)]에 ()가 있나
  {
    const matchedIndex = contents.slice(...templateRange).match(/\[\(.*\)]="[^"]*\(\)[^"]*"/)?.index;

    if (matchedIndex) {
      const line = Array.from(contents.slice(0, matchedIndex + templateRange[0]).matchAll(/\n/g)).length + 1;
      const char = matchedIndex + templateRange[0] - contents.slice(0, matchedIndex + templateRange[0]).lastIndexOf("\n");

      messages.push(`${srcPath}(${line}, ${char}): 템플릿에  this.`);
    }
  }

  //prettier
  /*try {
    const prettierOptions = await prettier.resolveConfig(srcPath);
    contents = await prettier.format(contents, {
      ...prettierOptions,
      filepath: srcPath,
    });
  } catch (err) {
    messages.push(`${srcPath}(${err.loc.start.line}, ${err.loc.start.column}): ${err.message}`);
  }*/

  /*if (contents !== prevContents) {
    fs.writeFileSync(srcPath, contents);
  }*/
}

console.error(messages.map((item, index) => `${item}[${index}]`).join("\n"));

/*
function getMatchPosition(contents, matchedIndex) {
  return {
    line: matchedIndex ? Array.from(contents.slice(0, matchedIndex).matchAll(/\n/g)).length + 1 : 0,
    char: matchedIndex ? matchedIndex - contents.slice(0, matchedIndex).lastIndexOf("\n") : 0,
  };
}

function stringInsert(str, index, insertString) {
  return str.substring(0, index) + insertString + str.substring(index);
}
*/
