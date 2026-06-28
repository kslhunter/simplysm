import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerCodexReasoningSummary(pi: ExtensionAPI) {
	pi.on("before_provider_request", (event, ctx) => {
		if (ctx.model?.api !== "openai-codex-responses") return;

		const payload = event.payload as { reasoning?: { summary?: unknown } };
		if (!payload.reasoning || !("summary" in payload.reasoning)) return;

		delete payload.reasoning.summary;
		return payload;
	});
}
