import { registerAppendSystem } from "./append-system.ts";
import { registerClear } from "./clear.ts";
import { registerExit } from "./exit.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerAltEnterNewline } from "./tui/alt-enter-newline.ts";
import { registerClipboardImagePaste } from "./tui/clipboard-image-paste.ts";
import { registerPasteTrim } from "./tui/paste-trim.ts";
import { registerRewind } from "./tui/rewind.ts";
import { registerSelection } from "./tui/selection.ts";
import { registerWorkingElapsed } from "./tui/working-elapsed.ts";
import { registerCodexFastMode } from "./codex/fast-mode.ts";
import { registerCodexReasoningSummary } from "./codex/reasoning-summary.ts";
import { registerCodexStatusline } from "./codex/statusline.ts";
import { registerAutoUpdate } from "./update/auto-update.ts";
import { registerHooks } from "./hooks/register.ts";
import { registerSubagent } from "./tools/subagent.ts";
import { registerSkill } from "./tools/skill.ts";
import { registerWebFetch } from "./tools/web-fetch.ts";
import { registerWebSearch } from "./tools/web-search.ts";

export default function (pi: ExtensionAPI) {
  registerAppendSystem(pi);

  registerExit(pi);
  registerClear(pi);

  // tui
  registerSelection(pi); // 항상 맨위 (Editor 갈아 끼움)
  registerAltEnterNewline(pi);
  registerPasteTrim(pi);
  registerClipboardImagePaste(pi);
  registerWorkingElapsed(pi);
  registerRewind(pi);

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
