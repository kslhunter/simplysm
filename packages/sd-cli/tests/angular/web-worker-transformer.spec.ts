import { describe, it, expect, vi } from "vitest";
import ts from "typescript";

const { createWorkerTransformer } = await import(
  "../../src/angular/web-worker-transformer.js"
);

//#region 헬퍼

/**
 * TypeScript 소스 코드에 transformer를 적용하고 결과 코드를 반환한다.
 */
function transformCode(
  code: string,
  fileProcessor: (workerFile: string, containingFile: string) => string,
  fileName = "test.ts",
): string {
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2022, true);
  const transformer = createWorkerTransformer(fileProcessor);
  const result = ts.transform(sourceFile, [transformer]);
  const printer = ts.createPrinter();
  const output = printer.printFile(result.transformed[0]);
  result.dispose();
  return output;
}

//#endregion

describe("createWorkerTransformer", () => {
  // Acceptance: Worker 표준 패턴을 감지하여 번들된 경로로 치환한다
  it("Worker 표준 패턴 — URL 치환 + { type: 'module' } 자동 추가", () => {
    const fileProcessor = vi.fn().mockReturnValue("worker-ABCD1234.js");
    const code = `const w = new Worker(new URL('./my-worker.ts', import.meta.url));`;

    const output = transformCode(code, fileProcessor);

    expect(fileProcessor).toHaveBeenCalledWith("./my-worker.ts", "test.ts");
    expect(output).toContain('"worker-ABCD1234.js"');
    expect(output).toContain('type');
    expect(output).toContain('"module"');
    expect(output).not.toContain("./my-worker.ts");
  });

  // Acceptance: SharedWorker도 동일하게 처리한다
  it("SharedWorker도 동일하게 변환한다", () => {
    const fileProcessor = vi.fn().mockReturnValue("worker-SHARED01.js");
    const code = `const sw = new SharedWorker(new URL('./shared.ts', import.meta.url));`;

    const output = transformCode(code, fileProcessor);

    expect(fileProcessor).toHaveBeenCalledWith("./shared.ts", "test.ts");
    expect(output).toContain('"worker-SHARED01.js"');
  });

  // Acceptance: Worker의 기존 options 인자가 있으면 유지한다
  it("기존 options 인자가 있으면 유지한다", () => {
    const fileProcessor = vi.fn().mockReturnValue("worker-OPT00001.js");
    const code = `const w = new Worker(new URL('./w.ts', import.meta.url), { name: 'test' });`;

    const output = transformCode(code, fileProcessor);

    expect(output).toContain('"worker-OPT00001.js"');
    expect(output).toContain("name");
    // { type: 'module' } 자동 추가 없이 기존 options가 유지됨
    expect(output).not.toMatch(/type.*module.*name/);
  });
});

describe("createWorkerTransformer — 변환하지 않는 케이스", () => {
  const noopProcessor = vi.fn().mockReturnValue("should-not-appear.js");

  // URL 패턴이 아닌 Worker 생성
  it("URL 패턴 없이 문자열 인자만 있으면 변환하지 않는다", () => {
    const code = `const w = new Worker('./my-worker.ts');`;
    const output = transformCode(code, noopProcessor);

    expect(noopProcessor).not.toHaveBeenCalled();
    expect(output).toContain("./my-worker.ts");
  });

  // import.meta.url이 아닌 URL
  it("import.meta.url이 아닌 URL은 변환하지 않는다", () => {
    const code = `const w = new Worker(new URL('./w.ts', 'http://example.com'));`;
    const output = transformCode(code, noopProcessor);

    expect(noopProcessor).not.toHaveBeenCalled();
    expect(output).toContain("./w.ts");
  });

  // Worker 인자 없음
  it("Worker 인자가 없으면 변환하지 않는다", () => {
    const code = `const w = new Worker();`;
    transformCode(code, noopProcessor);

    expect(noopProcessor).not.toHaveBeenCalled();
  });

  // Worker 인자 3개 이상
  it("Worker 인자가 3개 이상이면 변환하지 않는다", () => {
    const code = `const w = new Worker(new URL('./w.ts', import.meta.url), {}, 'extra');`;
    transformCode(code, noopProcessor);

    expect(noopProcessor).not.toHaveBeenCalled();
  });

  // URL 인자가 1개
  it("URL 인자가 1개면 변환하지 않는다", () => {
    const code = `const w = new Worker(new URL('./w.ts'));`;
    transformCode(code, noopProcessor);

    expect(noopProcessor).not.toHaveBeenCalled();
  });

  // URL 인자가 3개
  it("URL 인자가 3개면 변환하지 않는다", () => {
    const code = `const w = new Worker(new URL('./w.ts', import.meta.url, 'extra'));`;
    transformCode(code, noopProcessor);

    expect(noopProcessor).not.toHaveBeenCalled();
  });

  // 'Worker' 문자열 없으면 skip
  it("소스에 'Worker' 문자열이 없으면 변환을 건너뛴다", () => {
    const code = `const x = 1 + 2;`;
    const output = transformCode(code, noopProcessor);

    expect(noopProcessor).not.toHaveBeenCalled();
    expect(output).toContain("1 + 2");
  });
});

describe("createWorkerTransformer — 추가 경계 케이스", () => {
  // fileProcessor가 원본과 동일한 경로를 반환하면 변환하지 않는다
  it("fileProcessor가 원본 경로를 그대로 반환하면 AST를 변경하지 않는다", () => {
    const fileProcessor = vi.fn().mockReturnValue("./my-worker.ts");
    const code = `const w = new Worker(new URL('./my-worker.ts', import.meta.url));`;

    const output = transformCode(code, fileProcessor);

    expect(fileProcessor).toHaveBeenCalledWith("./my-worker.ts", "test.ts");
    // 원본 경로가 그대로 유지 (변환 없음)
    expect(output).toContain("./my-worker.ts");
  });

  // 소스에 Worker 문자열은 있지만 new 표현이 아닌 경우
  it("Worker 문자열이 있지만 new 표현이 아니면 변환하지 않는다", () => {
    const fileProcessor = vi.fn();
    const code = `const WorkerName = "test";`;

    transformCode(code, fileProcessor);

    expect(fileProcessor).not.toHaveBeenCalled();
  });
});
