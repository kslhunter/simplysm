import { copyToClipboard, CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  CURSOR_MARKER,
  matchesKey,
  truncateToWidth,
  visibleWidth,
  type EditorTheme,
  type TUI,
} from "@earendil-works/pi-tui";
// root export에는 wordWrapLine/TextChunk가 없고, wrapTextWithAnsi는 cursor 위치 계산에 필요한 startIndex/endIndex를 제공하지 않습니다.
// 에디터의 selection 렌더링을 기본 Editor와 동일하게 맞추기 위해 의도적으로 내부 경로를 사용합니다.
import { wordWrapLine, type TextChunk } from "@earendil-works/pi-tui/dist/components/editor.js";
// root export의 decodeKittyPrintable만으로는 xterm modifyOtherKeys printable 입력을 처리하지 못합니다.
// 기본 Editor와 같은 printable key 해석을 유지하기 위해 decodePrintableKey 내부 경로를 사용합니다.
import { decodePrintableKey } from "@earendil-works/pi-tui/dist/keys.js";

type Position = {
  line: number;
  col: number;
};

type SelectionRange = {
  start: Position;
  end: Position;
};

type LayoutLine = {
  text: string;
  logicalLine: number;
  startCol: number;
  endCol: number;
  hasCursor: boolean;
  cursorPos?: number;
};

type EditorState = {
  lines: string[];
  cursorLine: number;
  cursorCol: number;
};

type KillRingLike = {
  push(text: string, options?: { prepend?: boolean; accumulate?: boolean }): void;
};

type EditorInternals = {
  state: EditorState;
  onChange?: (text: string) => void;
  lastAction: string | null;
  isInPaste: boolean;
  killRing?: KillRingLike;
  handlePaste(pastedText: string): void;
  pushUndoSnapshot(): void;
  setCursorCol(col: number): void;
  cancelAutocomplete(): void;
  exitHistoryBrowsing(): void;
  insertTextAtCursorInternal(text: string): void;
  insertCharacter(char: string, skipUndoCoalescing?: boolean): void;
  moveCursor(deltaLine: number, deltaCol: number): void;
  moveToLineStart(): void;
  moveToLineEnd(): void;
  moveWordBackwards(): void;
  moveWordForwards(): void;
  pageScroll(direction: -1 | 1): void;
  segment(text: string, mode: "grapheme" | "word"): Iterable<Intl.SegmentData>;
};

type Notify = (message: string, type?: "info" | "warning" | "error") => void;

const BRACKETED_PASTE_START = "\x1b[200~";
const BRACKETED_PASTE_END = "\x1b[201~";
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

class SelectionEditor extends CustomEditor {
  private selectionAnchor: Position | null = null;
  private isReplacingSelectionPaste = false;
  private selectionPasteBuffer = "";
  private pasteReplacementRange: SelectionRange | null = null;
  private readonly editorKeybindings: ConstructorParameters<typeof CustomEditor>[2];

  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: ConstructorParameters<typeof CustomEditor>[2],
    private readonly notify: Notify,
  ) {
    super(tui, theme, keybindings);
    this.editorKeybindings = keybindings;
  }

  override setText(text: string): void {
    this.selectionAnchor = null;
    this.resetSelectionPaste();
    super.setText(text);
  }

  override insertTextAtCursor(text: string): void {
    if (!text) {
      return;
    }

    const range = this.getSelectionRange();
    if (range && this.isNonEmptyRange(range)) {
      this.replaceSelectionWithText(text, range);
      return;
    }

    super.insertTextAtCursor(text);
  }

  override handleInput(data: string): void {
    if (this.handleSelectionPasteInput(data)) {
      return;
    }

    if (this.editorInternals().isInPaste || data.includes(BRACKETED_PASTE_START)) {
      super.handleInput(data);
      return;
    }

    if (this.isSelectAllKey(data)) {
      this.selectAll();
      return;
    }

    if (this.isShiftSelectionKey(data)) {
      this.extendSelection(data);
      return;
    }

    const range = this.getSelectionRange();
    if (range && this.isNonEmptyRange(range)) {
      if (this.editorKeybindings.matches(data, "tui.input.copy")) {
        void this.copySelection();
        return;
      }

      if (this.isCutKey(data)) {
        void this.cutSelection();
        return;
      }

      if (this.isSelectionCancelKey(data)) {
        this.clearSelection();
        return;
      }

      if (this.editorKeybindings.matches(data, "tui.editor.cursorLeft")) {
        this.collapseSelection(range.start);
        return;
      }

      if (this.editorKeybindings.matches(data, "tui.editor.cursorRight")) {
        this.collapseSelection(range.end);
        return;
      }

      if (this.isSelectionDeleteKey(data)) {
        this.deleteSelection(range);
        return;
      }

      if (this.isSelectionNewLineKey(data)) {
        this.replaceSelectionWithText("\n", range);
        return;
      }

      if (this.editorKeybindings.matches(data, "app.clipboard.pasteImage")) {
        super.handleInput(data);
        return;
      }

      if (matchesKey(data, "shift+space")) {
        this.replaceSelectionWithCharacter(" ", range);
        return;
      }

      const printable = decodePrintableKey(data);
      if (printable !== undefined) {
        this.replaceSelectionWithCharacter(printable, range);
        return;
      }

      if (this.isPlainTextInput(data)) {
        this.replaceSelectionWithText(data, range);
        return;
      }
    }

    if (this.selectionAnchor) {
      this.selectionAnchor = null;
      this.tui.requestRender();
    }

    super.handleInput(data);
  }

  override render(width: number): string[] {
    if (!this.hasSelection()) {
      return super.render(width);
    }

    return this.renderWithSelection(width);
  }

  private editorInternals(): EditorInternals {
    return this as unknown as EditorInternals;
  }

  private isShiftSelectionKey(data: string): boolean {
    return (
      matchesKey(data, "shift+left") ||
      matchesKey(data, "shift+right") ||
      matchesKey(data, "shift+up") ||
      matchesKey(data, "shift+down") ||
      matchesKey(data, "shift+home") ||
      matchesKey(data, "shift+end") ||
      matchesKey(data, "shift+pageUp") ||
      matchesKey(data, "shift+pageDown") ||
      matchesKey(data, "ctrl+shift+left") ||
      matchesKey(data, "ctrl+shift+right") ||
      matchesKey(data, "alt+shift+left") ||
      matchesKey(data, "alt+shift+right")
    );
  }

  private extendSelection(data: string): void {
    if (!this.selectionAnchor) {
      this.selectionAnchor = this.getCursor();
    }

    const internals = this.editorInternals();

    if (matchesKey(data, "shift+left")) {
      internals.moveCursor(0, -1);
    } else if (matchesKey(data, "shift+right")) {
      internals.moveCursor(0, 1);
    } else if (matchesKey(data, "shift+up")) {
      internals.moveCursor(-1, 0);
    } else if (matchesKey(data, "shift+down")) {
      internals.moveCursor(1, 0);
    } else if (matchesKey(data, "shift+home")) {
      internals.moveToLineStart();
    } else if (matchesKey(data, "shift+end")) {
      internals.moveToLineEnd();
    } else if (matchesKey(data, "shift+pageUp")) {
      internals.pageScroll(-1);
    } else if (matchesKey(data, "shift+pageDown")) {
      internals.pageScroll(1);
    } else if (matchesKey(data, "ctrl+shift+left") || matchesKey(data, "alt+shift+left")) {
      internals.moveWordBackwards();
    } else if (matchesKey(data, "ctrl+shift+right") || matchesKey(data, "alt+shift+right")) {
      internals.moveWordForwards();
    }

    this.tui.requestRender();
  }

  private hasSelection(): boolean {
    const range = this.getSelectionRange();
    return range !== null && this.isNonEmptyRange(range);
  }

  private getSelectionRange(): SelectionRange | null {
    if (!this.selectionAnchor) {
      return null;
    }

    const cursor = this.getCursor();
    return this.comparePosition(this.selectionAnchor, cursor) <= 0
      ? { start: this.selectionAnchor, end: cursor }
      : { start: cursor, end: this.selectionAnchor };
  }

  private comparePosition(a: Position, b: Position): number {
    if (a.line !== b.line) {
      return a.line - b.line;
    }
    return a.col - b.col;
  }

  private isNonEmptyRange(range: SelectionRange): boolean {
    return this.comparePosition(range.start, range.end) !== 0;
  }

  private clonePosition(position: Position): Position {
    return { line: position.line, col: position.col };
  }

  private cloneRange(range: SelectionRange): SelectionRange {
    return { start: this.clonePosition(range.start), end: this.clonePosition(range.end) };
  }

  private sameRange(a: SelectionRange | null, b: SelectionRange | null): boolean {
    return (
      a !== null &&
      b !== null &&
      a.start.line === b.start.line &&
      a.start.col === b.start.col &&
      a.end.line === b.end.line &&
      a.end.col === b.end.col
    );
  }

  private async copySelection(): Promise<void> {
    const selectedText = this.getSelectedText();
    if (!selectedText) {
      return;
    }

    try {
      await copyToClipboard(selectedText);
      this.notify("선택 영역을 클립보드에 복사했습니다.", "info");
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      this.notify(`클립보드 복사에 실패했습니다: ${message}`, "error");
    }
  }

  private async cutSelection(): Promise<void> {
    const range = this.getSelectionRange();
    if (!range || !this.isNonEmptyRange(range)) {
      return;
    }

    const rangeSnapshot = this.cloneRange(range);
    const selectedText = this.getSelectedText(rangeSnapshot);
    if (!selectedText) {
      return;
    }

    try {
      await copyToClipboard(selectedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      this.notify(`클립보드 복사에 실패했습니다: ${message}`, "error");
      return;
    }

    if (!this.sameRange(rangeSnapshot, this.getSelectionRange())) {
      this.notify("선택이 변경되어 복사만 하고 삭제는 건너뛰었습니다.", "warning");
      return;
    }

    this.deleteSelection(rangeSnapshot, { selectedText });
    this.notify("선택 영역을 클립보드에 복사하고 삭제했습니다.", "info");
  }

  private getSelectedText(range = this.getSelectionRange()): string {
    if (!range) {
      return "";
    }

    const lines = this.getLines();
    if (range.start.line === range.end.line) {
      return (lines[range.start.line] ?? "").slice(range.start.col, range.end.col);
    }

    const selectedLines: string[] = [];
    selectedLines.push((lines[range.start.line] ?? "").slice(range.start.col));
    for (let line = range.start.line + 1; line < range.end.line; line++) {
      selectedLines.push(lines[line] ?? "");
    }
    selectedLines.push((lines[range.end.line] ?? "").slice(0, range.end.col));
    return selectedLines.join("\n");
  }

  private beginSelectionEdit(internals: EditorInternals): void {
    internals.cancelAutocomplete();
    internals.exitHistoryBrowsing();
    internals.lastAction = null;
    internals.pushUndoSnapshot();
  }

  private deleteSelection(
    range = this.getSelectionRange(),
    options: { selectedText?: string } = {},
  ): void {
    if (!range || !this.isNonEmptyRange(range)) {
      return;
    }

    const internals = this.editorInternals();
    this.beginSelectionEdit(internals);
    if (options.selectedText && internals.killRing) {
      internals.killRing.push(options.selectedText, { prepend: false, accumulate: false });
      internals.lastAction = "kill";
    }
    this.deleteSelectionRange(range, true);
  }

  private deleteSelectionRange(range: SelectionRange, emitChange: boolean): void {
    const internals = this.editorInternals();
    const lines = internals.state.lines;
    const startLine = lines[range.start.line] ?? "";
    const endLine = lines[range.end.line] ?? "";

    if (range.start.line === range.end.line) {
      lines[range.start.line] =
        startLine.slice(0, range.start.col) + startLine.slice(range.end.col);
    } else {
      lines.splice(
        range.start.line,
        range.end.line - range.start.line + 1,
        startLine.slice(0, range.start.col) + endLine.slice(range.end.col),
      );
    }

    internals.state.cursorLine = range.start.line;
    internals.setCursorCol(range.start.col);
    this.selectionAnchor = null;
    this.tui.requestRender();

    if (emitChange) {
      internals.onChange?.(this.getText());
    }
  }

  private replaceSelectionWithText(text: string, range = this.getSelectionRange()): void {
    if (!range || !this.isNonEmptyRange(range) || !text) {
      return;
    }

    const internals = this.editorInternals();
    this.beginSelectionEdit(internals);
    this.deleteSelectionRange(range, false);
    internals.insertTextAtCursorInternal(text);
    this.tui.requestRender();
  }

  private replaceSelectionWithCharacter(char: string, range = this.getSelectionRange()): void {
    if (!range || !this.isNonEmptyRange(range) || !char) {
      return;
    }

    const internals = this.editorInternals();
    this.beginSelectionEdit(internals);
    this.deleteSelectionRange(range, false);
    internals.insertCharacter(char, true);
    this.tui.requestRender();
  }

  private replaceSelectionWithPastedText(pastedText: string, range: SelectionRange): void {
    const internals = this.editorInternals();
    this.beginSelectionEdit(internals);
    this.deleteSelectionRange(range, false);

    const textAfterDeletion = this.getText();
    this.withoutAdditionalUndoSnapshot(() => internals.handlePaste(pastedText));
    if (this.getText() === textAfterDeletion) {
      internals.onChange?.(this.getText());
    }
    this.tui.requestRender();
  }

  private withoutAdditionalUndoSnapshot(action: () => void): void {
    const internals = this.editorInternals();
    const originalPushUndoSnapshot = internals.pushUndoSnapshot;
    internals.pushUndoSnapshot = () => {};
    try {
      action();
    } finally {
      internals.pushUndoSnapshot = originalPushUndoSnapshot;
    }
  }

  private handleSelectionPasteInput(data: string): boolean {
    if (this.isReplacingSelectionPaste) {
      this.selectionPasteBuffer += data;
      this.finishSelectionPasteIfComplete();
      return true;
    }

    if (!data.includes(BRACKETED_PASTE_START)) {
      return false;
    }

    const range = this.getSelectionRange();
    if (!range || !this.isNonEmptyRange(range)) {
      return false;
    }

    const startIndex = data.indexOf(BRACKETED_PASTE_START);
    this.isReplacingSelectionPaste = true;
    this.pasteReplacementRange = this.cloneRange(range);
    this.selectionPasteBuffer = data.slice(startIndex + BRACKETED_PASTE_START.length);
    this.finishSelectionPasteIfComplete();
    return true;
  }

  private finishSelectionPasteIfComplete(): void {
    const endIndex = this.selectionPasteBuffer.indexOf(BRACKETED_PASTE_END);
    if (endIndex === -1) {
      return;
    }

    const pasteContent = this.selectionPasteBuffer.slice(0, endIndex);
    const remaining = this.selectionPasteBuffer.slice(endIndex + BRACKETED_PASTE_END.length);
    const range = this.pasteReplacementRange;
    this.resetSelectionPaste();

    if (range && pasteContent.length > 0) {
      this.replaceSelectionWithPastedText(pasteContent, range);
    }

    if (remaining.length > 0) {
      this.handleInput(remaining);
    }
  }

  private resetSelectionPaste(): void {
    this.isReplacingSelectionPaste = false;
    this.selectionPasteBuffer = "";
    this.pasteReplacementRange = null;
  }

  private selectAll(): void {
    const lines = this.getLines();
    const endLine = Math.max(0, lines.length - 1);
    const endCol = lines[endLine]?.length ?? 0;
    this.selectionAnchor = { line: 0, col: 0 };
    this.setCursorPosition({ line: endLine, col: endCol });
    this.tui.requestRender();
  }

  private setCursorPosition(position: Position): void {
    const internals = this.editorInternals();
    const maxLine = Math.max(0, internals.state.lines.length - 1);
    const line = Math.max(0, Math.min(position.line, maxLine));
    const lineText = internals.state.lines[line] ?? "";
    const col = Math.max(0, Math.min(position.col, lineText.length));
    internals.state.cursorLine = line;
    internals.setCursorCol(col);
  }

  private collapseSelection(position: Position): void {
    this.setCursorPosition(position);
    this.selectionAnchor = null;
    this.tui.requestRender();
  }

  private clearSelection(): void {
    this.selectionAnchor = null;
    this.tui.requestRender();
  }

  private isSelectAllKey(data: string): boolean {
    return matchesKey(data, "ctrl+a");
  }

  private isCutKey(data: string): boolean {
    return matchesKey(data, "ctrl+x") || matchesKey(data, "shift+delete");
  }

  private isSelectionCancelKey(data: string): boolean {
    return matchesKey(data, "escape");
  }

  private isSelectionDeleteKey(data: string): boolean {
    return (
      this.editorKeybindings.matches(data, "tui.editor.deleteCharBackward") ||
      this.editorKeybindings.matches(data, "tui.editor.deleteCharForward") ||
      this.editorKeybindings.matches(data, "tui.editor.deleteWordBackward") ||
      this.editorKeybindings.matches(data, "tui.editor.deleteWordForward") ||
      this.editorKeybindings.matches(data, "tui.editor.deleteToLineStart") ||
      this.editorKeybindings.matches(data, "tui.editor.deleteToLineEnd") ||
      matchesKey(data, "shift+backspace")
    );
  }

  private isSelectionNewLineKey(data: string): boolean {
    return (
      this.editorKeybindings.matches(data, "tui.input.newLine") ||
      (data.charCodeAt(0) === 10 && data.length > 1) ||
      data === "\x1b\r" ||
      data === "\x1b[13;2~" ||
      (data.length > 1 && data.includes("\x1b") && data.includes("\r")) ||
      (data === "\n" && data.length === 1)
    );
  }

  private isPlainTextInput(data: string): boolean {
    return (
      data.length > 0 &&
      !data.includes("\x1b") &&
      [...data].every((char) => char === "\n" || char.charCodeAt(0) >= 32)
    );
  }

  private renderWithSelection(width: number): string[] {
    const maxPadding = Math.max(0, Math.floor((width - 1) / 2));
    const paddingX = Math.min(this.getPaddingX(), maxPadding);
    const contentWidth = Math.max(1, width - paddingX * 2);
    const layoutWidth = Math.max(1, contentWidth - (paddingX ? 0 : 1));
    const editorView = this as unknown as {
      lastWidth: number;
      scrollOffset: number;
      autocompleteState?: unknown;
      autocompleteList?: { render(width: number): string[] };
    };
    editorView.lastWidth = layoutWidth;

    const layoutLines = this.layoutSelectionText(layoutWidth);
    const terminalRows = this.tui.terminal.rows;
    const maxVisibleLines = Math.max(5, Math.floor(terminalRows * 0.3));
    let cursorLineIndex = layoutLines.findIndex((line) => line.hasCursor);
    if (cursorLineIndex === -1) {
      cursorLineIndex = 0;
    }

    if (cursorLineIndex < editorView.scrollOffset) {
      editorView.scrollOffset = cursorLineIndex;
    } else if (cursorLineIndex >= editorView.scrollOffset + maxVisibleLines) {
      editorView.scrollOffset = cursorLineIndex - maxVisibleLines + 1;
    }

    const maxScrollOffset = Math.max(0, layoutLines.length - maxVisibleLines);
    editorView.scrollOffset = Math.max(0, Math.min(editorView.scrollOffset, maxScrollOffset));
    const visibleLines = layoutLines.slice(
      editorView.scrollOffset,
      editorView.scrollOffset + maxVisibleLines,
    );
    const result: string[] = [];
    const horizontal = this.borderColor("─");
    const leftPadding = " ".repeat(paddingX);
    const rightPadding = leftPadding;

    if (editorView.scrollOffset > 0) {
      const indicator = `─── ↑ ${editorView.scrollOffset} more `;
      const remaining = width - visibleWidth(indicator);
      result.push(
        remaining >= 0
          ? this.borderColor(indicator + "─".repeat(remaining))
          : this.borderColor(truncateToWidth(indicator, width)),
      );
    } else {
      result.push(horizontal.repeat(width));
    }

    const emitCursorMarker = this.focused;
    for (const layoutLine of visibleLines) {
      const rendered = this.renderSelectionLine(layoutLine, emitCursorMarker);
      let lineVisibleWidth = visibleWidth(layoutLine.text);
      let cursorInPadding = false;
      if (this.shouldRenderSelectedEmptyCell(layoutLine)) {
        lineVisibleWidth += 1;
      }
      if (layoutLine.hasCursor && layoutLine.cursorPos === layoutLine.text.length) {
        lineVisibleWidth += 1;
        if (lineVisibleWidth > contentWidth && paddingX > 0) {
          cursorInPadding = true;
        }
      }

      const padding = " ".repeat(Math.max(0, contentWidth - lineVisibleWidth));
      const lineRightPadding = cursorInPadding ? rightPadding.slice(1) : rightPadding;
      result.push(`${leftPadding}${rendered}${padding}${lineRightPadding}`);
    }

    const linesBelow = layoutLines.length - (editorView.scrollOffset + visibleLines.length);
    if (linesBelow > 0) {
      const indicator = `─── ↓ ${linesBelow} more `;
      const remaining = width - visibleWidth(indicator);
      result.push(this.borderColor(indicator + "─".repeat(Math.max(0, remaining))));
    } else {
      result.push(horizontal.repeat(width));
    }

    if (editorView.autocompleteState && editorView.autocompleteList) {
      for (const line of editorView.autocompleteList.render(contentWidth)) {
        const lineWidth = visibleWidth(line);
        const linePadding = " ".repeat(Math.max(0, contentWidth - lineWidth));
        result.push(`${leftPadding}${line}${linePadding}${rightPadding}`);
      }
    }

    return result;
  }

  private layoutSelectionText(contentWidth: number): LayoutLine[] {
    const layoutLines: LayoutLine[] = [];
    const lines = this.getLines();
    const cursor = this.getCursor();

    if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
      layoutLines.push({
        text: "",
        logicalLine: 0,
        startCol: 0,
        endCol: 0,
        hasCursor: true,
        cursorPos: 0,
      });
      return layoutLines;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const isCurrentLine = i === cursor.line;
      if (visibleWidth(line) <= contentWidth) {
        layoutLines.push({
          text: line,
          logicalLine: i,
          startCol: 0,
          endCol: line.length,
          hasCursor: isCurrentLine,
          cursorPos: isCurrentLine ? cursor.col : undefined,
        });
        continue;
      }

      const chunks = this.wrapSelectionLine(line, contentWidth);
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        if (!chunk) {
          continue;
        }

        const isLastChunk = chunkIndex === chunks.length - 1;
        let hasCursor = false;
        let cursorPos = 0;
        if (isCurrentLine) {
          if (isLastChunk) {
            hasCursor = cursor.col >= chunk.startIndex;
            cursorPos = cursor.col - chunk.startIndex;
          } else {
            hasCursor = cursor.col >= chunk.startIndex && cursor.col < chunk.endIndex;
            if (hasCursor) {
              cursorPos = Math.min(cursor.col - chunk.startIndex, chunk.text.length);
            }
          }
        }

        layoutLines.push({
          text: chunk.text,
          logicalLine: i,
          startCol: chunk.startIndex,
          endCol: chunk.endIndex,
          hasCursor,
          cursorPos: hasCursor ? cursorPos : undefined,
        });
      }
    }

    return layoutLines;
  }

  private wrapSelectionLine(line: string, contentWidth: number): TextChunk[] {
    const segments = [...this.segmentText(line)];
    try {
      return wordWrapLine(line, contentWidth, segments);
    } catch {
      return this.forceWrapLine(line, contentWidth, segments);
    }
  }

  private forceWrapLine(
    line: string,
    contentWidth: number,
    segments: Intl.SegmentData[],
  ): TextChunk[] {
    if (!line) {
      return [{ text: "", startIndex: 0, endIndex: 0 }];
    }

    const chunks: TextChunk[] = [];
    let chunkStart = 0;
    let currentWidth = 0;
    for (const segment of segments) {
      const segmentWidth = visibleWidth(segment.segment);
      if (currentWidth > 0 && currentWidth + segmentWidth > contentWidth) {
        chunks.push({
          text: line.slice(chunkStart, segment.index),
          startIndex: chunkStart,
          endIndex: segment.index,
        });
        chunkStart = segment.index;
        currentWidth = 0;
      }

      if (currentWidth === 0 && segmentWidth > contentWidth) {
        chunks.push({
          text: segment.segment,
          startIndex: segment.index,
          endIndex: segment.index + segment.segment.length,
        });
        chunkStart = segment.index + segment.segment.length;
        continue;
      }

      currentWidth += segmentWidth;
    }

    if (chunkStart < line.length) {
      chunks.push({ text: line.slice(chunkStart), startIndex: chunkStart, endIndex: line.length });
    }
    return chunks.length > 0 ? chunks : [{ text: "", startIndex: 0, endIndex: 0 }];
  }

  private segmentText(text: string): Iterable<Intl.SegmentData> {
    const segmentHost = this as unknown as {
      segment?: (text: string, mode: "grapheme" | "word") => Iterable<Intl.SegmentData>;
    };
    return segmentHost.segment
      ? segmentHost.segment.call(this, text, "grapheme")
      : graphemeSegmenter.segment(text);
  }

  private renderSelectionLine(layoutLine: LayoutLine, emitCursorMarker: boolean): string {
    const selectedRange = this.getSelectedLocalRange(layoutLine);
    const cursorPos = layoutLine.hasCursor ? layoutLine.cursorPos : undefined;
    let rendered = "";
    let cursorRendered = false;

    if (this.shouldRenderSelectedEmptyCell(layoutLine)) {
      rendered += this.selectionStyle(" ");
    }

    for (const segment of this.segmentText(layoutLine.text)) {
      const start = segment.index;
      const end = start + segment.segment.length;
      if (cursorPos === start) {
        rendered += emitCursorMarker ? CURSOR_MARKER : "";
        rendered += this.cursorStyle(segment.segment);
        cursorRendered = true;
        continue;
      }

      const selected =
        selectedRange !== null && start < selectedRange.end && end > selectedRange.start;
      rendered += selected ? this.selectionStyle(segment.segment) : segment.segment;
    }

    if (cursorPos === layoutLine.text.length) {
      rendered += emitCursorMarker ? CURSOR_MARKER : "";
      rendered += this.cursorStyle(" ");
      cursorRendered = true;
    }

    if (!cursorRendered && cursorPos !== undefined) {
      rendered += emitCursorMarker ? CURSOR_MARKER : "";
      rendered += this.cursorStyle(" ");
    }

    return rendered;
  }

  private getSelectedLocalRange(layoutLine: LayoutLine): { start: number; end: number } | null {
    const range = this.getSelectionRange();
    if (
      !range ||
      layoutLine.logicalLine < range.start.line ||
      layoutLine.logicalLine > range.end.line
    ) {
      return null;
    }

    const lineText = this.getLines()[layoutLine.logicalLine] ?? "";
    const selectedStartCol = layoutLine.logicalLine === range.start.line ? range.start.col : 0;
    const selectedEndCol =
      layoutLine.logicalLine === range.end.line ? range.end.col : lineText.length;
    const start = Math.max(selectedStartCol, layoutLine.startCol) - layoutLine.startCol;
    const end = Math.min(selectedEndCol, layoutLine.endCol) - layoutLine.startCol;
    return end > start ? { start, end } : null;
  }

  private shouldRenderSelectedEmptyCell(layoutLine: LayoutLine): boolean {
    const range = this.getSelectionRange();
    return (
      layoutLine.text.length === 0 &&
      !layoutLine.hasCursor &&
      range !== null &&
      layoutLine.logicalLine > range.start.line &&
      layoutLine.logicalLine < range.end.line
    );
  }

  private selectionStyle(text: string): string {
    return `\x1b[7m${text}\x1b[0m`;
  }

  private cursorStyle(text: string): string {
    return `\x1b[7m${text}\x1b[0m`;
  }
}

export function registerSelection(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.setEditorComponent(
      (tui, theme, keybindings) =>
        new SelectionEditor(tui, theme, keybindings, ctx.ui.notify.bind(ctx.ui)),
    );
  });
}
