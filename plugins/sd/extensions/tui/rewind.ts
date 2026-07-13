import {
  DynamicBorder,
  type ExtensionAPI,
  type SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text } from "@earendil-works/pi-tui";

function getUserInputText(entry: SessionMessageEntry): string | undefined {
  if (entry.message.role !== "user") return undefined;

  const content = entry.message.content;
  const text =
    typeof content === "string"
      ? content
      : content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("");

  const singleLineText = text.replace(/[\r\n]+/g, " ").trim();
  return singleLineText || "(텍스트 없는 입력)";
}

export function registerRewind(pi: ExtensionAPI) {
  pi.registerCommand("rewind", {
    description: "현재 경로의 이전 사용자 입력으로 되돌리기",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/rewind는 TUI에서만 사용할 수 있습니다.", "error");
        return;
      }

      const items: SelectItem[] = ctx.sessionManager
        .getBranch()
        .filter((entry): entry is SessionMessageEntry => entry.type === "message")
        .map((entry) => ({ entry, text: getUserInputText(entry) }))
        .filter(
          (item): item is { entry: SessionMessageEntry; text: string } => item.text !== undefined,
        )
        .map((item) => ({ value: item.entry.id, label: item.text }));

      if (items.length === 0) {
        ctx.ui.notify("되돌릴 사용자 입력이 없습니다.", "warning");
        return;
      }

      const targetEntryId = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
        const container = new Container();
        container.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
        container.addChild(
          new Text(theme.fg("accent", theme.bold("되돌릴 사용자 입력 선택")), 1, 0),
        );

        const selectList = new SelectList(items, Math.min(items.length, 10), {
          selectedPrefix: (text) => theme.fg("accent", text),
          selectedText: (text) => theme.fg("accent", text),
          description: (text) => theme.fg("muted", text),
          scrollInfo: (text) => theme.fg("dim", text),
          noMatch: (text) => theme.fg("warning", text),
        });
        selectList.setSelectedIndex(items.length - 1);
        selectList.onSelect = (item) => done(item.value);
        selectList.onCancel = () => done(null);
        container.addChild(selectList);

        container.addChild(new Text(theme.fg("dim", "↑↓ 이동 • Enter 선택 • Esc 취소"), 1, 0));
        container.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));

        return {
          render: (width: number) => container.render(width),
          invalidate: () => container.invalidate(),
          handleInput: (data: string) => {
            selectList.handleInput(data);
            tui.requestRender();
          },
        };
      });

      if (!targetEntryId) return;
      await ctx.navigateTree(targetEntryId);
    },
  });
}
