import { registerAppendSystem } from "./append-system";
import { registerExit } from "./exit";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerAltEnterNewline } from "./tui/alt-enter-newline";
import { registerClipboardImagePaste } from "./tui/clipboard-image-paste";
import { registerPasteTrim } from "./tui/paste-trim";
import { registerSelection } from "./tui/selection";
import { registerWorkingElapsed } from "./tui/working-elapsed";
import { registerCodexFastMode } from "./codex/fast-mode";
import { registerCodexReasoningSummary } from "./codex/reasoning-summary";
import { registerCodexStatusline } from "./codex/statusline";
import { registerAutoUpdate } from "./update/auto-update";
import { registerHooks } from "./hooks/register.ts";
import { registerSubagent } from "./tools/subagent";
import { registerSkill } from "./tools/skill";
import { registerWebFetch } from "./tools/web-fetch";
import { registerWebSearch } from "./tools/web-search";

export default function (pi: ExtensionAPI) {
  registerAppendSystem(pi);

  registerExit(pi);

  // tui
  registerSelection(pi); // 항상 맨위 (Editor 갈아 끼움)
  registerAltEnterNewline(pi);
  registerPasteTrim(pi);
  registerClipboardImagePaste(pi);
  registerWorkingElapsed(pi);

  // codex
  registerCodexFastMode(pi);
  registerCodexReasoningSummary(pi);
  registerCodexStatusline(pi);

  // update
  registerAutoUpdate(pi);

  // hooks
  registerHooks(pi);

  // tools
  registerSubagent(pi);
  registerSkill(pi);
  registerWebFetch(pi);
  registerWebSearch(pi);
}
