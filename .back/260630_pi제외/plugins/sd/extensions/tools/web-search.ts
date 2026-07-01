import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const EXA_MCP_URL = "https://mcp.exa.ai/mcp";
const DEFAULT_NUM_RESULTS = 5;
const MAX_NUM_RESULTS = 20;
const REQUEST_TIMEOUT_MS = 60_000;
const CONTEXT_MAX_CHARACTERS = 3_000;
const MAX_RESULT_BYTES = 256 * 1024;

const WebSearchParams = Type.Object({
  query: Type.String({ description: "웹에서 검색할 쿼리" }),
  numResults: Type.Optional(
    Type.Integer({
      description: `관련도 높은 상위 결과 개수. 기본 ${DEFAULT_NUM_RESULTS}, 최대 ${MAX_NUM_RESULTS}`,
      minimum: 1,
      maximum: MAX_NUM_RESULTS,
    }),
  ),
});

interface ExaMcpRpcResponse {
  result?: {
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };
  error?: {
    code?: number;
    message?: string;
  };
}

interface WebSearchDetails {
  provider: "exa-mcp";
  endpoint: string;
  query: string;
  numResults: number;
  resultBytes: number;
}

export function registerWebSearch(pi: ExtensionAPI) {
  pi.registerTool(
    defineTool<typeof WebSearchParams, WebSearchDetails>({
      name: "web_search",
      label: "웹 검색",
      description:
        "Exa MCP 공개 엔드포인트를 통해 웹을 검색합니다. API 키 없이 동작하며, 검색 결과와 관련 문맥을 반환합니다. 결과가 256KB를 넘으면 부분 반환 없이 실패합니다.",
      promptSnippet: "Exa MCP를 통해 최신 웹 검색 결과와 출처를 가져옵니다.",
      promptGuidelines: [
        "최신 정보, 외부 문서, 공개 웹 자료 확인이 필요할 때 web_search를 적극 사용하세요.",
        "web_search는 URL 본문 전체를 안정적으로 가져오는 도구가 아니라 검색 결과 도구입니다. 특정 URL 본문 전체가 필요하면 별도 web_fetch도구나 fetch/curl 절차를 사용하세요.",
      ],
      parameters: WebSearchParams,

      renderCall(args, theme) {
        const query = typeof args.query === "string" ? args.query : "";
        const numResults = getRenderableNumResults(args.numResults);
        return new Text(
          `${theme.fg("toolTitle", theme.bold("web_search"))} ${theme.fg("accent", JSON.stringify(query))}${theme.fg("dim", ` top ${numResults}`)}`,
          0,
          0,
        );
      },

      async execute(_toolCallId, params, signal, onUpdate) {
        const query = params.query.trim();
        if (!query) throw new Error("검색 쿼리가 비어 있습니다.");

        const numResults = normalizeNumResults(params.numResults);
        const pendingDetails: WebSearchDetails = {
          provider: "exa-mcp",
          endpoint: EXA_MCP_URL,
          query,
          numResults,
          resultBytes: 0,
        };

        onUpdate?.({
          content: [{ type: "text" as const, text: `Exa MCP에서 검색 중: ${query}` }],
          details: pendingDetails,
        });

        const text = await callExaMcpSearch(query, numResults, signal);
        const resultBytes = byteLength(text);
        if (resultBytes > MAX_RESULT_BYTES) throwTooLarge(resultBytes, query, numResults);

        return {
          content: [{ type: "text" as const, text }],
          details: { ...pendingDetails, resultBytes },
        };
      },

      renderResult(result, { expanded, isPartial }, theme, context) {
        const details = result.details;
        if (isPartial) {
          const query = details?.query
            ? ` ${theme.fg("accent", JSON.stringify(details.query))}`
            : "";
          return new Text(`${theme.fg("warning", "⏳")} Exa MCP 검색 중${query}`, 0, 0);
        }

        if (context.isError) {
          const errorText = getTextContent(result.content) || "알 수 없는 web_search 오류";
          if (!expanded) {
            return new Text(
              `${theme.fg("error", "✗")} web_search 실패 ${theme.fg("error", errorText)}`,
              0,
              0,
            );
          }
          return new Text(theme.fg("error", errorText), 0, 0);
        }

        if (!details) {
          const text = result.content[0];
          return new Text(text?.type === "text" ? text.text : "(검색 결과 없음)", 0, 0);
        }

        if (!expanded) {
          return new Text(
            `${theme.fg("success", "✓")} Exa MCP 검색 완료 ${theme.fg("accent", JSON.stringify(details.query))}${theme.fg("dim", ` (${details.numResults}개 요청, ${formatBytes(details.resultBytes)})`)}`,
            0,
            0,
          );
        }

        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "(검색 결과 없음)", 0, 0);
      },
    }),
  );
}

async function callExaMcpSearch(
  query: string,
  numResults: number,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(EXA_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "web_search_exa",
        arguments: {
          query,
          numResults,
          livecrawl: "fallback",
          type: "auto",
          contextMaxCharacters: CONTEXT_MAX_CHARACTERS,
        },
      },
    }),
    signal: requestSignal(signal),
  });

  const body = await readResponseTextLimited(response, MAX_RESULT_BYTES, query, numResults);

  if (!response.ok) {
    throw new Error(`Exa MCP 오류 ${response.status}: ${body.slice(0, 1000)}`);
  }

  return extractMcpText(body);
}

async function readResponseTextLimited(
  response: Response,
  maxBytes: number,
  query: string,
  numResults: number,
): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throwTooLarge(totalBytes, query, numResults);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function extractMcpText(body: string): string {
  const parsed = parseMcpResponse(body);

  if (parsed.error) {
    const code = typeof parsed.error.code === "number" ? ` ${parsed.error.code}` : "";
    const message = parsed.error.message || "알 수 없는 오류";
    throw new Error(`Exa MCP 오류${code}: ${message}`);
  }

  const textParts = parsed.result?.content
    ?.filter(
      (item) =>
        item.type === "text" && typeof item.text === "string" && item.text.trim().length > 0,
    )
    .map((item) => item.text!.trim());

  if (parsed.result?.isError) {
    throw new Error(textParts?.join("\n\n") || "Exa MCP가 오류를 반환했습니다.");
  }

  const text = textParts?.join("\n\n").trim();
  if (!text) throw new Error("Exa MCP가 빈 검색 결과를 반환했습니다.");
  return text;
}

function parseMcpResponse(body: string): ExaMcpRpcResponse {
  const dataLines = body.split("\n").filter((line) => line.startsWith("data:"));

  for (const line of dataLines) {
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    const parsed = parseJsonResponse(payload);
    if (parsed?.result || parsed?.error) return parsed;
  }

  const parsed = parseJsonResponse(body);
  if (parsed?.result || parsed?.error) return parsed;

  throw new Error("Exa MCP 응답을 해석할 수 없습니다.");
}

function parseJsonResponse(value: string): ExaMcpRpcResponse | undefined {
  try {
    const parsed = JSON.parse(value) as ExaMcpRpcResponse;
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function requestSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function getRenderableNumResults(value: unknown): number {
  return isValidNumResults(value) ? value : DEFAULT_NUM_RESULTS;
}

function normalizeNumResults(value: unknown): number {
  if (value === undefined) return DEFAULT_NUM_RESULTS;
  if (!isValidNumResults(value)) {
    throw new Error(`web_search numResults는 1 이상 ${MAX_NUM_RESULTS} 이하의 정수여야 합니다.`);
  }
  return value;
}

function isValidNumResults(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_NUM_RESULTS
  );
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function getTextContent(content: Array<{ type: string; text?: string }>): string | undefined {
  const text = content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
  return text || undefined;
}

function throwTooLarge(bytes: number, query: string, numResults: number): never {
  throw new Error(
    `Exa MCP 검색 결과가 비정상적으로 큽니다 (${formatBytes(bytes)} > ${formatBytes(MAX_RESULT_BYTES)}). ` +
      `부분 결과를 잘라 반환하지 않았습니다. numResults(${numResults})를 줄이거나 쿼리를 더 좁혀 다시 검색하세요: ${query}`,
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
