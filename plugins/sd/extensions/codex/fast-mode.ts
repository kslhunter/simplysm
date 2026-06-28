import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

type FastModeChangeListener = () => void;

interface PersistedFastModeState {
	version: 1;
	enabled: boolean;
	updatedAt: string;
}

export const CODEX_FAST_MODE_ENV = "PI_CODEX_FAST_MODE";

const FAST_MODE_CUSTOM_TYPE = "simplysm.codex.fastMode";
const FAST_MODE_DEFAULT_FILE = "simplysm-codex-fast-mode.json";

let fastModeEnabled = readEnvFastMode() ?? readDefaultFastMode() ?? false;
const fastModeChangeListeners = new Set<FastModeChangeListener>();

export function isCodexFastModeEnabled(): boolean {
	return fastModeEnabled;
}

export function onCodexFastModeChange(listener: FastModeChangeListener): () => void {
	fastModeChangeListeners.add(listener);
	return () => fastModeChangeListeners.delete(listener);
}

function setCodexFastModeEnabled(enabled: boolean) {
	if (fastModeEnabled === enabled) return;

	fastModeEnabled = enabled;
	for (const listener of fastModeChangeListeners) listener();
}

export function registerCodexFastMode(pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		setCodexFastModeEnabled(resolveFastModeForSession(ctx));
		persistSessionFastModeIfNeeded(pi, ctx);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		persistSessionFastModeIfNeeded(pi, ctx);
	});

	pi.on("session_tree", (_event, ctx) => {
		setCodexFastModeEnabled(resolveFastModeForSession(ctx));
	});

	pi.registerCommand("fast", {
		description: "Codex 빠른 모드를 켭니다. 끄려면 '/fast off'를 사용하세요.",
		handler: async (args, ctx) => {
			const parsed = parseFastCommand(args);
			if (parsed === undefined) {
				ctx.ui.notify("사용법: /fast 또는 /fast off", "error");
				return;
			}

			setCodexFastModeEnabled(parsed);
			persistSessionFastModeIfNeeded(pi, ctx, true);
			if (!writeDefaultFastMode(parsed)) {
				ctx.ui.notify("fast 기본값 저장에 실패했습니다.", "warning");
			}
		},
	});

	pi.on("before_provider_request", (event, ctx) => {
		if (!fastModeEnabled) return;
		if (ctx.model?.api !== "openai-codex-responses") return;

		const payload = event.payload as { service_tier?: string };
		payload.service_tier = "priority";
		return payload;
	});
}

function parseFastCommand(args: string): boolean | undefined {
	const value = args.trim().toLowerCase();
	if (value === "" || value === "on") return true;
	if (value === "off") return false;
	return undefined;
}

function resolveFastModeForSession(ctx: ExtensionContext): boolean {
	return readSessionFastMode(ctx) ?? readEnvFastMode() ?? readDefaultFastMode() ?? false;
}

function readSessionFastMode(ctx: ExtensionContext): boolean | undefined {
	const branch = ctx.sessionManager.getBranch();
	for (let i = branch.length - 1; i >= 0; i--) {
		const entry = branch[i];
		if (entry.type !== "custom") continue;
		if (entry.customType !== FAST_MODE_CUSTOM_TYPE) continue;

		const enabled = parseFastModeEnabled(entry.data);
		if (enabled !== undefined) return enabled;
	}

	return undefined;
}

function persistSessionFastModeIfNeeded(pi: ExtensionAPI, ctx: ExtensionContext, force = false) {
	const sessionValue = readSessionFastMode(ctx);
	if (!force && sessionValue === fastModeEnabled) return;

	pi.appendEntry(FAST_MODE_CUSTOM_TYPE, createFastModeState(fastModeEnabled));
}

function readEnvFastMode(): boolean | undefined {
	const value = process.env[CODEX_FAST_MODE_ENV]?.trim().toLowerCase();
	if (value === undefined || value === "") return undefined;
	if (["1", "true", "on", "yes"].includes(value)) return true;
	if (["0", "false", "off", "no"].includes(value)) return false;
	return undefined;
}

function readDefaultFastMode(): boolean | undefined {
	const path = getDefaultFastModePath();
	if (!existsSync(path)) return undefined;

	try {
		const data = JSON.parse(readFileSync(path, "utf8")) as unknown;
		return parseFastModeEnabled(data);
	} catch {
		return undefined;
	}
}

function writeDefaultFastMode(enabled: boolean): boolean {
	try {
		const path = getDefaultFastModePath();
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, `${JSON.stringify(createFastModeState(enabled), null, 2)}\n`, "utf8");
		return true;
	} catch {
		return false;
	}
}

function getDefaultFastModePath(): string {
	return join(getAgentDir(), FAST_MODE_DEFAULT_FILE);
}

function createFastModeState(enabled: boolean): PersistedFastModeState {
	return {
		version: 1,
		enabled,
		updatedAt: new Date().toISOString(),
	};
}

function parseFastModeEnabled(data: unknown): boolean | undefined {
	if (typeof data === "boolean") return data;
	if (!data || typeof data !== "object") return undefined;

	const enabled = (data as { enabled?: unknown }).enabled;
	return typeof enabled === "boolean" ? enabled : undefined;
}
