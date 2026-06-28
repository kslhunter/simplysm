import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { isCodexFastModeEnabled, onCodexFastModeChange } from "./fast-mode.ts";

const STATUS_KEY = "openai-codex-statusline";
const FIVE_HOUR_WINDOW_MINUTES = 5 * 60;
const WEEKLY_WINDOW_MINUTES = 7 * 24 * 60;
const STATUS_REFRESH_MS = 60 * 1000;
const RATE_LIMIT_REFRESH_MIN_INTERVAL_MS = 60 * 1000;
const RATE_LIMIT_FETCH_TIMEOUT_MS = 10 * 1000;

interface RateLimitWindow {
	usedPercent: number;
	windowMinutes?: number;
	resetAt?: number;
}

interface RateLimitSnapshot {
	primary?: RateLimitWindow;
	secondary?: RateLimitWindow;
}

interface CreditsSnapshot {
	balance: number;
}

interface ParsedUsagePayload {
	snapshot: RateLimitSnapshot;
	credits?: CreditsSnapshot;
	modelSpecific: boolean;
}

interface CodexRateLimitState {
	fiveHour?: RateLimitWindow;
	weekly?: RateLimitWindow;
	credits?: CreditsSnapshot;
}

interface RateLimitRefreshRequest {
	key: string;
	generation: number;
	controller: AbortController;
	promise: Promise<void>;
}

let latestContext: ExtensionContext | undefined;
let statusTimer: ReturnType<typeof setInterval> | undefined;
let installedFooterToken: symbol | undefined;
let requestFooterRender: (() => void) | undefined;
let currentStatusText = "";
let currentModelText = "";
let currentFastMode = false;
let currentThinkingLevel: string | undefined;
let rateLimitState: CodexRateLimitState = {};
let rateLimitStateIsModelSpecific = false;
let lastRateLimitRefreshAttempt = 0;
let rateLimitRefreshGeneration = 0;
let rateLimitRefreshRequest: RateLimitRefreshRequest | undefined;

export function registerCodexStatusline(pi: ExtensionAPI) {
	onCodexFastModeChange(() => {
		if (latestContext) updateStatus(latestContext);
	});

	pi.on("session_start", (_event, ctx) => {
		rateLimitState = {};
		rateLimitStateIsModelSpecific = false;
		invalidateRateLimitRefresh();
		syncThinkingLevel(pi);
		if (!isTuiContext(ctx)) return;
		activate(ctx);
		void refreshRateLimits(ctx, true);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		restoreFooter(ctx);
		rateLimitState = {};
		rateLimitStateIsModelSpecific = false;
		invalidateRateLimitRefresh();
		latestContext = undefined;
		clearStatusTimer();
	});

	pi.on("model_select", (_event, ctx) => {
		rateLimitState = {};
		rateLimitStateIsModelSpecific = false;
		invalidateRateLimitRefresh();
		syncThinkingLevel(pi);
		if (!isTuiContext(ctx)) return;
		activate(ctx);
		void refreshRateLimits(ctx, true);
	});

	pi.on("context", (_event, ctx) => activate(ctx));
	pi.on("turn_start", (_event, ctx) => activate(ctx));
	pi.on("message_end", (_event, ctx) => activate(ctx));
	pi.on("thinking_level_select", (event, ctx) => {
		currentThinkingLevel = event.level;
		activate(ctx);
	});

	pi.on("turn_end", (_event, ctx) => {
		activate(ctx);
		void refreshRateLimits(ctx);
	});

	pi.on("after_provider_response", (event, ctx) => {
		if (!isTuiContext(ctx)) return;
		latestContext = ctx;

		if (!isCodexModel(ctx)) {
			updateStatus(ctx);
			return;
		}

		if (modelRateLimitRefreshKey(ctx.model) !== rateLimitRefreshKey(ctx)) {
			void refreshRateLimits(ctx);
			activate(ctx);
			return;
		}

		const snapshot = parseRateLimitHeaders(event.headers);
		if (snapshot && !rateLimitStateIsModelSpecific) {
			mergeRateLimitSnapshot(snapshot);
		} else {
			void refreshRateLimits(ctx);
		}

		activate(ctx);
	});
}

function activate(ctx: ExtensionContext) {
	if (!isTuiContext(ctx)) return;
	latestContext = ctx;
	updateStatus(ctx);
	ensureStatusTimer(ctx);
}

function ensureStatusTimer(ctx: ExtensionContext) {
	if (!isTuiContext(ctx) || !isCodexModel(ctx)) {
		clearStatusTimer();
		return;
	}

	if (statusTimer) return;

	statusTimer = setInterval(() => {
		const ctx = latestContext;
		if (!ctx) return;

		if (!isCodexModel(ctx)) {
			clearStatusTimer();
			ctx.ui.setStatus(STATUS_KEY, undefined);
			return;
		}

		updateStatus(ctx);

		if (hasExpiredWindow()) {
			void refreshRateLimits(ctx);
		}
	}, STATUS_REFRESH_MS);

	(statusTimer as { unref?: () => void }).unref?.();
}

function clearStatusTimer() {
	if (!statusTimer) return;
	clearInterval(statusTimer);
	statusTimer = undefined;
}

function isTuiContext(ctx: ExtensionContext): boolean {
	return ctx.mode === "tui";
}

function isCodexModel(ctx: ExtensionContext): boolean {
	const model = ctx.model;
	return model?.provider === "openai-codex" || model?.api === "openai-codex-responses";
}

function rateLimitRefreshKey(ctx: ExtensionContext): string | undefined {
	return modelRateLimitRefreshKey(ctx.model);
}

function modelRateLimitRefreshKey(model: ExtensionContext["model"]): string | undefined {
	if (!model) return undefined;

	return [model.provider, model.api, model.id, model.baseUrl].map((part) => part ?? "").join("\0");
}

function invalidateRateLimitRefresh() {
	rateLimitRefreshGeneration += 1;
	lastRateLimitRefreshAttempt = 0;
	rateLimitRefreshRequest?.controller.abort();
	rateLimitRefreshRequest = undefined;
}

function syncThinkingLevel(pi: ExtensionAPI) {
	try {
		currentThinkingLevel = pi.getThinkingLevel();
	} catch {
		currentThinkingLevel = undefined;
	}
}

function formatModelEffort(ctx: ExtensionContext): string {
	return [ctx.model?.id, currentThinkingLevel].filter((value): value is string => Boolean(value)).join(" ");
}

function renderModelEffort(theme: Theme): string {
	const modelText = currentModelText ? theme.fg("dim", currentModelText) : "";
	if (!currentFastMode) return modelText;

	const fastText = theme.fg("thinkingXhigh", "fast");
	return modelText ? `${modelText} ${fastText}` : fastText;
}

function updateStatus(ctx: ExtensionContext) {
	if (!isTuiContext(ctx)) return;

	if (!isCodexModel(ctx)) {
		restoreFooter(ctx);
		return;
	}

	installFooter(ctx);
	currentStatusText = [
		formatContextUsage(ctx),
		formatWindow(rateLimitState.fiveHour, "hoursMinutes"),
		formatWindow(rateLimitState.weekly, "daysHours"),
		formatCredits(rateLimitState.credits),
	]
		.filter((value): value is string => Boolean(value))
		.join(" · ");
	currentModelText = formatModelEffort(ctx);
	currentFastMode = isCodexFastModeEnabled();
	requestFooterRender?.();
}

function installFooter(ctx: ExtensionContext) {
	if (!isTuiContext(ctx)) return;

	// 기본 footer가 표시하는 정보보다 Codex 전용 상태 정보가 더 중요하므로 의도적으로 footer를 완전히 교체합니다.
	// setStatus를 함께 사용하면 기존 footer 레이아웃에 섞여 표시되므로, 여기서는 전용 footer 하나로 렌더링합니다.
	ctx.ui.setStatus(STATUS_KEY, undefined);
	if (installedFooterToken) return;

	const footerToken = Symbol(STATUS_KEY);
	installedFooterToken = footerToken;
	ctx.ui.setFooter((tui, theme) => {
		const requestRender = () => tui.requestRender();
		requestFooterRender = requestRender;

		return {
			dispose() {
				if (installedFooterToken === footerToken) {
					installedFooterToken = undefined;
				}
				if (requestFooterRender === requestRender) {
					requestFooterRender = undefined;
				}
			},
			invalidate() {},
			render(width: number): string[] {
				const left = theme.fg("dim", currentStatusText);
				const right = renderModelEffort(theme);
				const rightWidth = visibleWidth(right);
				const availableLeftWidth = Math.max(0, width - rightWidth - 1);
				const visibleLeft = truncateToWidth(left, availableLeftWidth);
				const pad = " ".repeat(Math.max(1, width - visibleWidth(visibleLeft) - rightWidth));
				return [truncateToWidth(`${visibleLeft}${pad}${right}`, width)];
			},
		};
	});
}

function restoreFooter(ctx: ExtensionContext) {
	currentStatusText = "";
	currentModelText = "";
	currentFastMode = false;
	if (!isTuiContext(ctx)) {
		installedFooterToken = undefined;
		requestFooterRender = undefined;
		return;
	}

	ctx.ui.setStatus(STATUS_KEY, undefined);
	if (!installedFooterToken) return;

	installedFooterToken = undefined;
	requestFooterRender = undefined;
	ctx.ui.setFooter(undefined);
}

function formatContextUsage(ctx: ExtensionContext): string {
	const usage = ctx.getContextUsage();
	if (!usage || usage.percent === null) return "?%";
	return formatPercent(usage.percent);
}

function formatWindow(window: RateLimitWindow | undefined, format: "hoursMinutes" | "daysHours"): string {
	if (!window) return "?%(?)";

	const time = window.resetAt === undefined ? "?" : formatRemainingTime(window.resetAt, format);
	return `${formatPercent(window.usedPercent)}(${time})`;
}

function formatCredits(credits: CreditsSnapshot | undefined): string | undefined {
	if (!credits) return undefined;
	return `${Math.floor(credits.balance)}cr`;
}

function formatPercent(value: number): string {
	return `${Math.round(clamp(value, 0, 100))}%`;
}

function formatRemainingTime(resetAtSeconds: number, format: "hoursMinutes" | "daysHours"): string {
	const remainingMs = Math.max(0, resetAtSeconds * 1000 - Date.now());
	const totalMinutes = Math.ceil(remainingMs / 60_000);

	if (format === "daysHours" && totalMinutes >= 24 * 60) {
		const totalHours = Math.ceil(totalMinutes / 60);
		const days = Math.floor(totalHours / 24);
		const hours = totalHours % 24;
		return `${days}d${hours}h`;
	}

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}h${minutes}m`;
}

function hasExpiredWindow(): boolean {
	const nowSeconds = Date.now() / 1000;
	return [rateLimitState.fiveHour, rateLimitState.weekly].some((window) => {
		return window?.resetAt !== undefined && window.resetAt <= nowSeconds;
	});
}

function parseRateLimitHeaders(headers: Record<string, string>): RateLimitSnapshot | undefined {
	const normalizedHeaders = normalizeHeaders(headers);
	const primary = parseHeaderWindow(normalizedHeaders, "x-codex-primary");
	const secondary = parseHeaderWindow(normalizedHeaders, "x-codex-secondary");

	if (!primary && !secondary) return undefined;
	return { primary, secondary };
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
	const normalized: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		normalized[key.toLowerCase()] = value;
	}
	return normalized;
}

function parseHeaderWindow(headers: Record<string, string>, prefix: string): RateLimitWindow | undefined {
	const usedPercent = parseFiniteNumber(headers[`${prefix}-used-percent`]);
	if (usedPercent === undefined) return undefined;

	const windowMinutes = parseFiniteNumber(headers[`${prefix}-window-minutes`]);
	const resetAt = parseFiniteNumber(headers[`${prefix}-reset-at`]);
	const hasData = usedPercent !== 0 || (windowMinutes !== undefined && windowMinutes !== 0) || resetAt !== undefined;
	if (!hasData) return undefined;

	return {
		usedPercent,
		windowMinutes,
		resetAt,
	};
}

function mergeRateLimitSnapshot(snapshot: RateLimitSnapshot) {
	const fiveHour = selectWindow(snapshot, FIVE_HOUR_WINDOW_MINUTES, "primary");
	const weekly = selectWindow(snapshot, WEEKLY_WINDOW_MINUTES, "secondary");

	if (fiveHour) {
		rateLimitState.fiveHour = fiveHour;
	}

	if (weekly) {
		rateLimitState.weekly = weekly;
	}
}

function selectWindow(
	snapshot: RateLimitSnapshot,
	targetMinutes: number,
	fallbackKey: keyof RateLimitSnapshot,
): RateLimitWindow | undefined {
	const candidates = [snapshot.primary, snapshot.secondary].filter((window): window is RateLimitWindow => window !== undefined);
	const matched = candidates.find((window) => matchesWindowMinutes(window.windowMinutes, targetMinutes));
	if (matched) return matched;

	const fallback = snapshot[fallbackKey];
	return fallback?.windowMinutes === undefined ? fallback : undefined;
}

function matchesWindowMinutes(actual: number | undefined, expected: number): boolean {
	if (actual === undefined) return false;
	const tolerance = expected === WEEKLY_WINDOW_MINUTES ? 60 : 5;
	return Math.abs(actual - expected) <= tolerance;
}

async function refreshRateLimits(ctx: ExtensionContext, force = false) {
	if (!isTuiContext(ctx) || !isCodexModel(ctx)) return;

	const key = rateLimitRefreshKey(ctx);
	if (!key) return;

	const generation = rateLimitRefreshGeneration;
	if (rateLimitRefreshRequest?.key === key && rateLimitRefreshRequest.generation === generation) {
		return rateLimitRefreshRequest.promise;
	}

	const now = Date.now();
	if (!force && now - lastRateLimitRefreshAttempt < RATE_LIMIT_REFRESH_MIN_INTERVAL_MS) return;

	lastRateLimitRefreshAttempt = now;
	const controller = new AbortController();
	const promise = fetchRateLimits(ctx, generation, key, controller)
		.catch(() => undefined)
		.finally(() => {
			if (rateLimitRefreshRequest?.promise === promise) {
				rateLimitRefreshRequest = undefined;
			}
		});

	rateLimitRefreshRequest = { key, generation, controller, promise };
	return promise;
}

async function fetchRateLimits(ctx: ExtensionContext, generation: number, key: string, controller: AbortController) {
	const model = ctx.model;
	if (!model) return;

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok || !auth.apiKey || controller.signal.aborted) return;

	const timeout = setTimeout(() => controller.abort(), RATE_LIMIT_FETCH_TIMEOUT_MS);
	let payload: unknown;
	try {
		const response = await fetch(codexUsageUrl(model.baseUrl), {
			headers: buildCodexUsageHeaders(auth.apiKey, auth.headers),
			signal: controller.signal,
		});
		if (!response.ok) return;
		payload = await response.json();
	} finally {
		clearTimeout(timeout);
	}

	const usagePayload = parseUsagePayload(payload, model.id);
	if (!usagePayload) return;

	const ctxToUpdate = latestContext;
	if (generation !== rateLimitRefreshGeneration || !ctxToUpdate || !isCodexModel(ctxToUpdate)) return;
	if (rateLimitRefreshKey(ctxToUpdate) !== key) return;

	rateLimitStateIsModelSpecific = usagePayload.modelSpecific;
	mergeRateLimitSnapshot(usagePayload.snapshot);
	rateLimitState.credits = usagePayload.credits;
	updateStatus(ctxToUpdate);
}

function buildCodexUsageHeaders(apiKey: string, extraHeaders: Record<string, string> | undefined): Headers {
	const headers = new Headers(extraHeaders);
	headers.set("accept", "application/json");
	headers.set("Authorization", `Bearer ${apiKey}`);
	headers.set("originator", "pi");

	const accountId = extractAccountId(apiKey);
	if (accountId) {
		headers.set("ChatGPT-Account-Id", accountId);
	}

	if (!headers.has("user-agent")) {
		headers.set("User-Agent", "pi");
	}

	return headers;
}

function codexUsageUrl(baseUrl: string): string {
	let normalized = baseUrl.trim();
	while (normalized.endsWith("/")) {
		normalized = normalized.slice(0, -1);
	}

	if (
		(normalized.startsWith("https://chatgpt.com") || normalized.startsWith("https://chat.openai.com")) &&
		!normalized.includes("/backend-api")
	) {
		normalized = `${normalized}/backend-api`;
	}

	return normalized.includes("/backend-api") ? `${normalized}/wham/usage` : `${normalized}/api/codex/usage`;
}

function extractAccountId(token: string): string | undefined {
	const payload = token.split(".")[1];
	if (!payload) return undefined;

	try {
		const decoded = JSON.parse(Buffer.from(toBase64(payload), "base64").toString("utf8")) as unknown;
		const auth = asRecord(asRecord(decoded)?.["https://api.openai.com/auth"]);
		const accountId = auth?.chatgpt_account_id;
		return typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;
	} catch {
		return undefined;
	}
}

function toBase64(base64Url: string): string {
	const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
	const padding = "=".repeat((4 - (base64.length % 4)) % 4);
	return `${base64}${padding}`;
}

function parseUsagePayload(payload: unknown, modelId: string | undefined): ParsedUsagePayload | undefined {
	const root = asRecord(payload);
	if (!root) return undefined;

	const credits = parseUsageCredits(root.credits);
	const additionalSnapshots = parseAdditionalUsageSnapshots(root.additional_rate_limits);
	if (modelId) {
		const modelSpecific = additionalSnapshots.find(({ entry }) => matchesUsageEntryModel(entry, modelId));
		if (modelSpecific) return { snapshot: modelSpecific.snapshot, credits, modelSpecific: true };
	}

	const defaultRateLimit = asRecord(root.rate_limit);
	const snapshot: RateLimitSnapshot = {
		primary: parseUsageWindow(defaultRateLimit?.primary_window),
		secondary: parseUsageWindow(defaultRateLimit?.secondary_window),
	};

	if (snapshot.primary || snapshot.secondary || credits) return { snapshot, credits, modelSpecific: false };

	const firstAdditional = additionalSnapshots[0];
	return firstAdditional ? { snapshot: firstAdditional.snapshot, credits, modelSpecific: false } : undefined;
}

function parseAdditionalUsageSnapshots(
	value: unknown,
): Array<{ entry: Record<string, unknown>; snapshot: RateLimitSnapshot }> {
	if (!Array.isArray(value)) return [];

	const snapshots: Array<{ entry: Record<string, unknown>; snapshot: RateLimitSnapshot }> = [];
	for (const item of value) {
		const entry = asRecord(item);
		if (!entry) continue;

		const details = asRecord(entry.rate_limit);
		const snapshot: RateLimitSnapshot = {
			primary: parseUsageWindow(details?.primary_window),
			secondary: parseUsageWindow(details?.secondary_window),
		};
		if (snapshot.primary || snapshot.secondary) {
			snapshots.push({ entry, snapshot });
		}
	}

	return snapshots;
}

function matchesUsageEntryModel(entry: Record<string, unknown>, modelId: string): boolean {
	return Object.entries(entry).some(([key, value]) => {
		if (key === "rate_limit") return false;
		return matchesModelReference(value, modelId);
	});
}

function matchesModelReference(value: unknown, modelId: string): boolean {
	if (typeof value === "string") return modelStringMatches(value, modelId);
	if (Array.isArray(value)) return value.some((item) => matchesModelReference(item, modelId));

	const record = asRecord(value);
	if (!record) return false;
	return Object.values(record).some((item) => matchesModelReference(item, modelId));
}

function modelStringMatches(value: string, modelId: string): boolean {
	const normalizedModelId = normalizeModelReference(modelId);
	if (!normalizedModelId) return false;

	if (normalizeModelReference(value) === normalizedModelId) return true;
	return value.split(/[/:]/).some((part) => normalizeModelReference(part) === normalizedModelId);
}

function normalizeModelReference(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseUsageCredits(value: unknown): CreditsSnapshot | undefined {
	const credits = asRecord(value);
	if (!credits || credits.has_credits !== true) return undefined;

	const balance = parseFiniteNumber(credits.balance);
	if (balance === undefined || balance <= 0) return undefined;

	return { balance };
}

function parseUsageWindow(value: unknown): RateLimitWindow | undefined {
	const window = asRecord(value);
	if (!window) return undefined;

	const usedPercent = parseFiniteNumber(window.used_percent);
	if (usedPercent === undefined) return undefined;

	const limitWindowSeconds = parseFiniteNumber(window.limit_window_seconds);
	const resetAt = parseFiniteNumber(window.reset_at);
	const resetAfterSeconds = parseFiniteNumber(window.reset_after_seconds);

	return {
		usedPercent,
		windowMinutes:
			limitWindowSeconds !== undefined && limitWindowSeconds > 0 ? Math.ceil(limitWindowSeconds / 60) : undefined,
		resetAt: resetAt ?? (resetAfterSeconds === undefined ? undefined : Math.floor(Date.now() / 1000 + resetAfterSeconds)),
	};
}

function parseFiniteNumber(value: unknown): number | undefined {
	const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
	return number !== undefined && Number.isFinite(number) ? number : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
