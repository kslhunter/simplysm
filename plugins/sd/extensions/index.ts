import { registerAppendSystem } from "./append-system";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerAltEnterNewline } from "./tui/alt-enter-newline";
import { registerPasteTrim } from "./tui/paste-trim";
import { registerSelection } from "./tui/selection";
import { registerWorkingElapsed } from "./tui/working-elapsed";
import { registerCodexFastMode } from "./codex/fast-mode";
import { registerCodexReasoningSummary } from "./codex/reasoning-summary";
import { registerCodexStatusline } from "./codex/statusline";
import { registerAutoUpdate } from "./update/auto-update";
import { registerGitGuard } from "./guards/git-guard";
import { registerWriteHashGuard } from "./guards/write-hash-guard";
import { registerSubagent } from "./tools/subagent";
import { registerSkill } from "./tools/skill";
import { registerWebFetch } from "./tools/web-fetch";
import { registerWebSearch } from "./tools/web-search";

export default function (pi: ExtensionAPI) {
  registerAppendSystem(pi);

  // tui
  registerSelection(pi); // 항상 맨위 (Editor 갈아 끼움)
  registerAltEnterNewline(pi);
  registerPasteTrim(pi);
  registerWorkingElapsed(pi);

  // codex
  registerCodexFastMode(pi);
  registerCodexReasoningSummary(pi);
  registerCodexStatusline(pi);

  // update
  registerAutoUpdate(pi);

  // guards
  registerGitGuard(pi);
  registerWriteHashGuard(pi);

  // tools
  registerSubagent(pi);
  registerSkill(pi);
  registerWebFetch(pi);
  registerWebSearch(pi);
}
