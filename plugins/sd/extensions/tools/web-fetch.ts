import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_REDIRECTS = 5;
const MAX_RAW_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;

const WebFetchParams = Type.Object({
  url: Type.String({ description: "가져올 http/https URL" }),
});

interface WebFetchDetails {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  rawBytes: number;
  outputBytes: number;
  redirects: number;
  title?: string;
}

interface FetchResponse {
  response: IncomingMessage;
  finalUrl: string;
  redirects: number;
}

export function registerWebFetch(pi: ExtensionAPI) {
  pi.registerTool(
    defineTool<typeof WebFetchParams, WebFetchDetails>({
      name: "web_fetch",
      label: "웹 가져오기",
      description:
        "http/https URL을 가져와 텍스트로 반환합니다. HTML은 script/style을 제거한 읽기용 텍스트로 변환합니다. 너무 큰 응답은 잘라 반환하지 않고 실패합니다.",
      promptSnippet: "URL의 본문 텍스트를 가져옵니다. HTML은 읽기용 텍스트로 단순 변환합니다.",
      promptGuidelines: [
        "특정 URL의 본문 내용 확인이 필요할 때 web_fetch를 사용하세요.",
        "web_fetch는 http/https URL만 지원하며 localhost, 사설망, link-local, 메타데이터 주소는 안전상 차단합니다.",
        "web_fetch가 너무 큰 응답으로 실패하면 URL 범위를 좁히거나 사용자의 확인을 받아 다른 절차를 사용하세요. 잘린 부분 결과를 근거로 판단하지 마세요.",
      ],
      parameters: WebFetchParams,

      renderCall(args, theme) {
        const url = typeof args.url === "string" ? args.url : "";
        return new Text(
          `${theme.fg("toolTitle", theme.bold("web_fetch"))} ${theme.fg("accent", url)}`,
          0,
          0,
        );
      },

      async execute(_toolCallId, params, signal, onUpdate) {
        const requestedUrl = params.url.trim();
        const startUrl = parseHttpUrl(requestedUrl);

        onUpdate?.({
          content: [{ type: "text" as const, text: `URL 가져오는 중: ${startUrl.toString()}` }],
          details: {
            url: requestedUrl,
            finalUrl: startUrl.toString(),
            status: 0,
            contentType: "",
            rawBytes: 0,
            outputBytes: 0,
            redirects: 0,
          },
        });

        const { response, finalUrl, redirects } = await fetchWithRedirects(startUrl, signal);
        const status = response.statusCode ?? 0;
        const statusText = response.statusMessage ?? "";
        const contentType = getResponseHeader(response, "content-type") ?? "";

        if (status < 200 || status >= 300) {
          throw new Error(`web_fetch HTTP 오류 ${status} ${statusText}: ${finalUrl}`);
        }

        if (!isTextualContentType(contentType)) {
          throw new Error(
            `web_fetch는 텍스트 응답만 반환합니다. content-type=${contentType || "unknown"}: ${finalUrl}`,
          );
        }

        const rawText = await readResponseTextLimited(response, MAX_RAW_BYTES);
        const rawBytes = byteLength(rawText);
        const extracted = contentType.toLowerCase().includes("html")
          ? extractHtmlContent(rawText)
          : { text: rawText.trim(), title: undefined };

        const output = formatFetchOutput({
          finalUrl,
          status,
          contentType,
          title: extracted.title,
          text: extracted.text,
        });
        const outputBytes = byteLength(output);
        if (outputBytes > MAX_OUTPUT_BYTES) throwOutputTooLarge(outputBytes, finalUrl);

        return {
          content: [{ type: "text" as const, text: output }],
          details: {
            url: requestedUrl,
            finalUrl,
            status,
            contentType,
            rawBytes,
            outputBytes,
            redirects,
            title: extracted.title,
          },
        };
      },

      renderResult(result, { expanded, isPartial }, theme, context) {
        const details = result.details;
        if (isPartial) {
          const url = details?.finalUrl ? ` ${theme.fg("accent", details.finalUrl)}` : "";
          return new Text(`${theme.fg("warning", "⏳")} URL 가져오는 중${url}`, 0, 0);
        }

        if (context.isError) {
          const errorText = getTextContent(result.content) || "알 수 없는 web_fetch 오류";
          if (!expanded) {
            return new Text(
              `${theme.fg("error", "✗")} web_fetch 실패 ${theme.fg("error", errorText)}`,
              0,
              0,
            );
          }
          return new Text(theme.fg("error", errorText), 0, 0);
        }

        if (!details) {
          const text = result.content[0];
          return new Text(text?.type === "text" ? text.text : "(내용 없음)", 0, 0);
        }

        if (!expanded) {
          const title = details.title ? ` ${theme.fg("accent", details.title)}` : "";
          return new Text(
            `${theme.fg("success", "✓")} web_fetch 완료${title}${theme.fg("dim", ` (${details.status}, ${formatBytes(details.outputBytes)})`)}`,
            0,
            0,
          );
        }

        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "(내용 없음)", 0, 0);
      },
    }),
  );
}

async function fetchWithRedirects(startUrl: URL, signal?: AbortSignal): Promise<FetchResponse> {
  let current = startUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const attemptSignal = requestSignal(signal);
    const response = await requestPublicHttpUrl(current, attemptSignal);
    const status = response.statusCode ?? 0;

    if (!isRedirectStatus(status)) {
      return { response, finalUrl: current.toString(), redirects };
    }

    const location = getResponseHeader(response, "location");
    if (!location) {
      return { response, finalUrl: current.toString(), redirects };
    }

    response.resume();

    if (redirects >= MAX_REDIRECTS) {
      throw new Error(`web_fetch redirect가 너무 많습니다 (${MAX_REDIRECTS}회 초과): ${startUrl.toString()}`);
    }

    current = new URL(location, current);
  }

  throw new Error(`web_fetch redirect 처리에 실패했습니다: ${startUrl.toString()}`);
}

async function requestPublicHttpUrl(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  const resolvedAddresses = await resolvePublicHttpUrl(url, signal);
  const errors: Error[] = [];

  for (const resolvedAddress of resolvedAddresses) {
    try {
      return await requestResolvedPublicHttpUrl(url, resolvedAddress, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      errors.push(toError(error));
    }
  }

  const attempts = resolvedAddresses.map(formatLookupAddress).join(", ") || "none";
  const messages = errors.map((error) => error.message).join("; ") || "unknown";
  throw new Error(`web_fetch 연결에 실패했습니다: ${url.toString()} (시도 주소: ${attempts}, 오류: ${messages})`);
}

async function requestResolvedPublicHttpUrl(
  url: URL,
  resolvedAddress: LookupAddress,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const tlsServername = url.protocol === "https:" ? getTlsServername(url) : undefined;
  const requestOptions = {
    protocol: url.protocol,
    hostname: resolvedAddress.address,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    method: "GET",
    headers: {
      "User-Agent": "simplysm-pi-web-fetch/0.1",
      Accept: "text/html,text/plain,application/json,application/xml,text/markdown,*/*;q=0.8",
      Host: url.host,
    },
    signal,
    ...(tlsServername ? { servername: tlsServername } : {}),
  };

  return new Promise((resolve, reject) => {
    const req = url.protocol === "https:"
      ? httpsRequest(requestOptions, resolve)
      : httpRequest(requestOptions, resolve);

    req.on("error", reject);
    req.end();
  });
}

function parseHttpUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`유효한 URL이 아닙니다: ${value}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`web_fetch는 http/https URL만 지원합니다: ${value}`);
  }

  if (!url.hostname) throw new Error(`URL에 hostname이 없습니다: ${value}`);
  return url;
}

async function resolvePublicHttpUrl(url: URL, signal: AbortSignal): Promise<LookupAddress[]> {
  parseHttpUrl(url.toString());

  const hostname = normalizeHostname(url.hostname);
  if (isBlockedHostname(hostname)) {
    throw new Error(`안전상 차단된 hostname입니다: ${hostname}`);
  }

  const literalIpType = isIP(hostname);
  if (literalIpType) {
    if (isBlockedIp(hostname)) throw new Error(`안전상 차단된 IP 주소입니다: ${hostname}`);
    return [{ address: hostname, family: literalIpType }];
  }

  const addresses = await waitForSignal(
    lookup(hostname, { all: true, verbatim: false }),
    signal,
    `web_fetch DNS 조회 시간이 초과되었습니다: ${hostname}`,
  );
  if (addresses.length === 0) throw new Error(`hostname을 해석할 수 없습니다: ${hostname}`);

  for (const address of addresses) {
    if ((address.family !== 4 && address.family !== 6) || isBlockedIp(address.address)) {
      throw new Error(`안전상 차단된 주소로 해석됩니다: ${hostname} -> ${address.address}`);
    }
  }

  return addresses;
}

function normalizeHostname(hostname: string): string {
  const normalized = hostname.trim().toLowerCase();
  return normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized.slice(1, -1)
    : normalized;
}

function getTlsServername(url: URL): string | undefined {
  const hostname = normalizeHostname(url.hostname);
  return isIP(hostname) ? undefined : hostname;
}

function formatLookupAddress(address: LookupAddress): string {
  return `${address.address}/${address.family}`;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isBlockedHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  );
}

function isBlockedIp(address: string): boolean {
  const normalized = normalizeHostname(address);
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4);

  const ipType = isIP(normalized);
  if (ipType === 4) return isBlockedIpv4(normalized);
  if (ipType === 6) return isBlockedIpv6(normalized);
  return true;
}

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedIpv6(address: string): boolean {
  const groups = parseIpv6Groups(address);
  if (!groups) return true;

  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  const isUniqueLocal = (groups[0] & 0xfe00) === 0xfc00;
  const isLinkLocal = (groups[0] & 0xffc0) === 0xfe80;
  const isMulticast = (groups[0] & 0xff00) === 0xff00;

  if (isUnspecified || isLoopback || isUniqueLocal || isLinkLocal || isMulticast) return true;

  const isIpv4Mapped = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  const isIpv4Compatible = groups.slice(0, 6).every((group) => group === 0);
  if (isIpv4Mapped || isIpv4Compatible) {
    const ipv4 = `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
    return isBlockedIpv4(ipv4);
  }

  return false;
}

function parseIpv6Groups(address: string): number[] | undefined {
  const normalized = address.toLowerCase().split("%")[0];
  const [head = "", tail = "", extra] = normalized.split("::");
  if (extra !== undefined) return undefined;

  const headGroups = parseIpv6GroupList(head);
  const tailGroups = parseIpv6GroupList(tail);
  if (!headGroups || !tailGroups) return undefined;

  if (!normalized.includes("::")) return headGroups.length === 8 ? headGroups : undefined;

  const missing = 8 - headGroups.length - tailGroups.length;
  if (missing < 1) return undefined;
  return [...headGroups, ...Array.from({ length: missing }, () => 0), ...tailGroups];
}

function parseIpv6GroupList(value: string): number[] | undefined {
  if (!value) return [];
  return value.split(":").map((part) => {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return Number.NaN;
    return Number.parseInt(part, 16);
  }).every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff)
    ? value.split(":").map((part) => Number.parseInt(part, 16))
    : undefined;
}

function requestSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function waitForSignal<T>(operation: Promise<T>, signal: AbortSignal, timeoutMessage: string): Promise<T> {
  if (signal.aborted) return Promise.reject(signalReasonToError(signal.reason, timeoutMessage));

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signalReasonToError(signal.reason, timeoutMessage));
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function signalReasonToError(reason: unknown, timeoutMessage: string): Error {
  if (reason instanceof Error) {
    return reason.name === "TimeoutError" ? new Error(timeoutMessage) : reason;
  }
  return new Error(timeoutMessage);
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isTextualContentType(contentType: string): boolean {
  if (!contentType.trim()) return true;
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("javascript") ||
    normalized.includes("markdown") ||
    normalized.includes("x-www-form-urlencoded")
  );
}

async function readResponseTextLimited(response: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBytes) {
      response.destroy();
      throw new Error(
        `web_fetch 응답이 너무 큽니다 (${formatBytes(totalBytes)} > ${formatBytes(maxBytes)}). ` +
          "부분 응답은 반환하지 않았습니다. 더 작은 문서나 구체적인 URL을 사용하세요.",
      );
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function getResponseHeader(response: IncomingMessage, name: string): string | undefined {
  const value = response.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

function extractHtmlContent(html: string): { text: string; title?: string } {
  const title = decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "") || undefined;

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] ?? html;
  const withoutNoise = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, "");

  const withLineBreaks = withoutNoise
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|article|section|main|header|footer|nav|aside|h[1-6]|li|ul|ol|table|thead|tbody|tfoot|tr|blockquote|pre)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");

  const text = normalizeExtractedText(decodeHtmlEntities(withLineBreaks));
  return { text, title };
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#x")) {
      return decodeCodePoint(Number.parseInt(key.slice(2), 16)) ?? match;
    }
    if (key.startsWith("#")) {
      return decodeCodePoint(Number.parseInt(key.slice(1), 10)) ?? match;
    }
    return named[key] ?? match;
  });
}

function decodeCodePoint(codePoint: number): string | undefined {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : undefined;
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatFetchOutput(input: {
  finalUrl: string;
  status: number;
  contentType: string;
  title?: string;
  text: string;
}): string {
  const lines = [
    `URL: ${input.finalUrl}`,
    `Status: ${input.status}`,
    `Content-Type: ${input.contentType || "unknown"}`,
  ];
  if (input.title) lines.push(`Title: ${input.title}`);
  lines.push("", input.text || "(본문 텍스트 없음)");
  return lines.join("\n");
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

function throwOutputTooLarge(bytes: number, finalUrl: string): never {
  throw new Error(
    `web_fetch 추출 결과가 너무 큽니다 (${formatBytes(bytes)} > ${formatBytes(MAX_OUTPUT_BYTES)}). ` +
      `부분 결과를 잘라 반환하지 않았습니다. 더 구체적인 URL을 사용하세요: ${finalUrl}`,
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
