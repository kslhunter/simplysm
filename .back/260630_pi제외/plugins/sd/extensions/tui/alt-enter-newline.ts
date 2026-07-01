import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

const SHIFT_ENTER_CSI_U = "\x1b[13;2u";

export function registerAltEnterNewline(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const currentEditorComponent = ctx.ui.getEditorComponent();
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      const editor = currentEditorComponent
        ? currentEditorComponent(tui, theme, keybindings)
        : new CustomEditor(tui, theme, keybindings);
      const handleInput = editor.handleInput.bind(editor);

      editor.handleInput = (data: string) => {
        if (matchesKey(data, "alt+enter")) {
          handleInput(SHIFT_ENTER_CSI_U);
          return;
        }

        handleInput(data);
      };

      return editor;
    });
  });
}
