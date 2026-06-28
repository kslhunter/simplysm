import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BRACKETED_PASTE_START = "\x1b[200~";
const BRACKETED_PASTE_END = "\x1b[201~";

export function registerPasteTrim(pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;

		const currentEditorComponent = ctx.ui.getEditorComponent();
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			const editor = currentEditorComponent
				? currentEditorComponent(tui, theme, keybindings)
				: new CustomEditor(tui, theme, keybindings);
			const handleInput = editor.handleInput.bind(editor);
			let pasteBuffer = "";
			let isInPaste = false;

			editor.handleInput = (data: string) => {
				let remaining = data;

				while (remaining.length > 0) {
					if (!isInPaste) {
						const startIndex = remaining.indexOf(BRACKETED_PASTE_START);
						if (startIndex === -1) {
							handleInput(remaining);
							return;
						}

						const beforePaste = remaining.slice(0, startIndex);
						if (beforePaste) {
							handleInput(beforePaste);
						}

						isInPaste = true;
						pasteBuffer = "";
						remaining = remaining.slice(startIndex + BRACKETED_PASTE_START.length);
					}

					const endIndex = remaining.indexOf(BRACKETED_PASTE_END);
					if (endIndex === -1) {
						pasteBuffer += remaining;
						return;
					}

					pasteBuffer += remaining.slice(0, endIndex);
					const trimmedPaste = trimRightEachLine(pasteBuffer);
					handleInput(`${BRACKETED_PASTE_START}${trimmedPaste}${BRACKETED_PASTE_END}`);

					isInPaste = false;
					pasteBuffer = "";
					remaining = remaining.slice(endIndex + BRACKETED_PASTE_END.length);
				}
			};

			return editor;
		});
	});
}

function trimRightEachLine(text: string): string {
	return text.replace(/[^\S\r\n]+(?=\r?\n|$)/g, "");
}
