/** 원격 위키 CLI (플러그인 sd-wiki).
 *
 * 에이전트가 Bash 로 능동 호출하는 진입점. 인자 파싱 → `wiki_core` 위임 → JSON 출력만
 * 담당. 원격 호출·인증·충돌 재시도 등 메커니즘은 전부 `wiki_core` 에 있고 이 파일엔 없음
 * (명령 추가·변경 시 이 파일만 보면 됨).
 *
 *   bun "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.ts" <명령> ...
 *
 * stdout 은 서비스 응답 JSON, 오류는 stderr + 비0 종료코드.
 */

import { readFile } from "node:fs/promises";
import {
  WikiApiError,
  WikiAuthError,
  WikiAuthExpired,
  WikiWriteConflict,
  browserLogin,
  callService,
  getToken,
  writePage,
} from "./wiki_core.ts";

interface BaseArgs {
  readonly command: string;
  readonly noBrowser: boolean;
}

interface TopicArgs extends BaseArgs {
  readonly topic: string;
}

interface SearchArgs extends BaseArgs {
  readonly keyword: string;
}

interface WriteArgs extends TopicArgs {
  readonly title: string;
  readonly summary: string;
  readonly body?: string;
  readonly bodyFile?: string;
  readonly baseVersion?: number;
  readonly parent?: string;
}

interface MoveArgs extends TopicArgs {
  readonly parent?: string;
  readonly root: boolean;
}

type CliArgs = BaseArgs | TopicArgs | SearchArgs | WriteArgs | MoveArgs;

class CliParseError extends Error {}

function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data ?? null, undefined, 2));
  process.stdout.write("\n");
}

function decodeUtf8Strict(data: Buffer | Uint8Array | ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileReadError(error: unknown): boolean {
  return isRecord(error) && typeof error["code"] === "string";
}

async function readBodyFile(filePath: string): Promise<string> {
  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch (error) {
    if (isFileReadError(error)) {
      throw new WikiApiError(`본문 파일을 읽을 수 없습니다: ${getErrorMessage(error)}`);
    }
    throw error;
  }
  return decodeUtf8Strict(bytes);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

async function readStdin(): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += String(chunk);
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function readBodyArg(args: WriteArgs): Promise<string> {
  if (args.body !== undefined && args.bodyFile !== undefined) {
    throw new WikiApiError("--body 와 --body-file 은 함께 쓸 수 없습니다.");
  }
  if (args.body !== undefined) return args.body;
  if (args.bodyFile !== undefined) return await readBodyFile(args.bodyFile);
  if (!process.stdin.isTTY) return await readStdin();
  throw new WikiApiError("본문은 --body, --body-file 또는 stdin 으로 입력해야 합니다.");
}

function parseIntegerOption(optionLabel: string, value: string | undefined): number {
  if (value === undefined) throw new CliParseError(`${optionLabel} 값이 필요합니다.`);
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) throw new CliParseError(`${optionLabel} 값은 정수여야 합니다.`);
  return parsedValue;
}

function takeValue(argv: string[], index: number, optionLabel: string): [string, number] {
  const value = argv[index + 1];
  if (value === undefined) throw new CliParseError(`${optionLabel} 값이 필요합니다.`);
  return [value, index + 2];
}

function ensureNoExtra(argv: string[], index: number): void {
  if (index < argv.length) throw new CliParseError(`알 수 없는 인자: ${argv[index]}`);
}

function parseArgv(argv: string[]): CliArgs {
  let index = 0;
  let noBrowser = false;
  while (argv[index] === "--no-browser") {
    noBrowser = true;
    index += 1;
  }

  const command = argv[index];
  if (command === undefined) throw new CliParseError("명령이 필요합니다.");
  index += 1;

  if (command === "read" || command === "children" || command === "delete") {
    const topic = argv[index];
    if (topic === undefined) throw new CliParseError(`${command} 명령에는 topic 이 필요합니다.`);
    index += 1;

    if (command === "delete") {
      let baseVersion: number | undefined;
      while (index < argv.length) {
        const optionLabel = argv[index];
        if (optionLabel === "--base-version") {
          baseVersion = parseIntegerOption(optionLabel, argv[index + 1]);
          index += 2;
        } else {
          throw new CliParseError(`알 수 없는 인자: ${optionLabel}`);
        }
      }
      return baseVersion === undefined ? { command, noBrowser, topic } : { command, noBrowser, topic, baseVersion };
    }

    ensureNoExtra(argv, index);
    return { command, noBrowser, topic };
  }

  if (command === "search") {
    const keyword = argv[index];
    if (keyword === undefined) throw new CliParseError("search 명령에는 keyword 가 필요합니다.");
    index += 1;
    ensureNoExtra(argv, index);
    return { command, noBrowser, keyword };
  }

  if (command === "toc" || command === "rootmap" || command === "lint") {
    ensureNoExtra(argv, index);
    return { command, noBrowser };
  }

  if (command === "write") {
    const topic = argv[index];
    if (topic === undefined) throw new CliParseError("write 명령에는 topic 이 필요합니다.");
    index += 1;

    let title: string | undefined;
    let summary: string | undefined;
    let body: string | undefined;
    let bodyFile: string | undefined;
    let baseVersion: number | undefined;
    let parent: string | undefined;

    while (index < argv.length) {
      const optionLabel = argv[index];
      if (optionLabel === "--title") {
        [title, index] = takeValue(argv, index, optionLabel);
      } else if (optionLabel === "--summary") {
        [summary, index] = takeValue(argv, index, optionLabel);
      } else if (optionLabel === "--body") {
        [body, index] = takeValue(argv, index, optionLabel);
      } else if (optionLabel === "--body-file") {
        [bodyFile, index] = takeValue(argv, index, optionLabel);
      } else if (optionLabel === "--base-version") {
        baseVersion = parseIntegerOption(optionLabel, argv[index + 1]);
        index += 2;
      } else if (optionLabel === "--parent") {
        [parent, index] = takeValue(argv, index, optionLabel);
      } else {
        throw new CliParseError(`알 수 없는 인자: ${optionLabel}`);
      }
    }

    if (title === undefined) throw new CliParseError("write 명령에는 --title 이 필요합니다.");
    if (summary === undefined) throw new CliParseError("write 명령에는 --summary 가 필요합니다.");

    return { command, noBrowser, topic, title, summary, body, bodyFile, baseVersion, parent };
  }

  if (command === "move") {
    const topic = argv[index];
    if (topic === undefined) throw new CliParseError("move 명령에는 topic 이 필요합니다.");
    index += 1;

    let parent: string | undefined;
    let root = false;
    while (index < argv.length) {
      const optionLabel = argv[index];
      if (optionLabel === "--parent") {
        [parent, index] = takeValue(argv, index, optionLabel);
      } else if (optionLabel === "--root") {
        root = true;
        index += 1;
      } else {
        throw new CliParseError(`알 수 없는 인자: ${optionLabel}`);
      }
    }

    if ((parent !== undefined && root) || (parent === undefined && !root)) {
      throw new CliParseError("move 명령에는 --parent 또는 --root 중 하나가 필요합니다.");
    }
    return { command, noBrowser, topic, parent, root };
  }

  throw new CliParseError(`알 수 없는 명령: ${command}`);
}

function asTopicArgs(args: CliArgs): TopicArgs {
  return args as TopicArgs;
}

function asSearchArgs(args: CliArgs): SearchArgs {
  return args as SearchArgs;
}

function asWriteArgs(args: CliArgs): WriteArgs {
  return args as WriteArgs;
}

function asMoveArgs(args: CliArgs): MoveArgs {
  return args as MoveArgs;
}

async function runCommand(args: CliArgs, token: string): Promise<unknown> {
  if (args.command === "read") return await callService("read", [asTopicArgs(args).topic], token);
  if (args.command === "search") return await callService("search", [asSearchArgs(args).keyword], token);
  if (args.command === "toc") return await callService("toc", [], token);
  if (args.command === "rootmap") return await callService("rootMap", [], token);
  if (args.command === "children") return await callService("children", [asTopicArgs(args).topic], token);
  if (args.command === "write") {
    const writeArgs = asWriteArgs(args);
    const inputData: Record<string, unknown> = {
      topic: writeArgs.topic,
      title: writeArgs.title,
      summary: writeArgs.summary,
      body: await readBodyArg(writeArgs),
    };
    if (writeArgs.baseVersion !== undefined) inputData["baseVersion"] = writeArgs.baseVersion;
    if (writeArgs.parent !== undefined) inputData["parentTopic"] = writeArgs.parent;
    return await writePage(inputData, token);
  }
  if (args.command === "delete") {
    const topicArgs = asTopicArgs(args);
    const deleteInput: Record<string, unknown> = { topic: topicArgs.topic };
    const baseVersion = (args as { readonly baseVersion?: number }).baseVersion;
    if (baseVersion !== undefined) deleteInput["baseVersion"] = baseVersion;
    return await callService("delete", [deleteInput], token);
  }
  if (args.command === "move") {
    const moveArgs = asMoveArgs(args);
    const parentTopic = moveArgs.root ? null : moveArgs.parent;
    return await callService("move", [{ topic: moveArgs.topic, parentTopic }], token);
  }
  if (args.command === "lint") return await callService("lint", [], token);
  throw new WikiApiError(`알 수 없는 명령: ${args.command}`);
}

async function main(argv: string[]): Promise<number> {
  let args: CliArgs;
  try {
    args = parseArgv(argv);
  } catch (error) {
    if (error instanceof CliParseError) {
      console.error(error.message);
      return 2;
    }
    throw error;
  }

  const allowBrowser = !args.noBrowser;

  try {
    let token = await getToken(allowBrowser);
    if (token === null) return 1;
    let result: unknown;
    try {
      result = await runCommand(args, token);
    } catch (error) {
      if (!(error instanceof WikiAuthExpired)) throw error;
      if (!allowBrowser) throw error;
      token = await browserLogin();
      result = await runCommand(args, token);
    }
    printJson(result);
    return 0;
  } catch (error) {
    if (error instanceof WikiWriteConflict) {
      // 충돌은 실패(비0 종료)로 알리되, 재통합에 필요한 최신 본문을 stdout 으로 함께 전달.
      printJson({ conflict: true, message: error.message, latest: error.latest });
      return 3;
    }
    if (error instanceof WikiAuthError) {
      console.error(`위키 인증 오류: ${error.message}`);
      return 2;
    }
    if (error instanceof WikiApiError) {
      console.error(`위키 API 오류: ${error.message}`);
      return 2;
    }
    throw error;
  }
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
