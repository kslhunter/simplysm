export function formatRootmapItems(rootmap: unknown): string {
  if (!Array.isArray(rootmap)) {
    throw new Error("위키 ROOT MAP 응답은 배열이어야 합니다.");
  }

  const lines: string[] = [];
  for (const item of rootmap) {
    if (!isRecord(item)) {
      throw new Error("위키 ROOT MAP 항목은 객체여야 합니다.");
    }

    const topic = item["topic"];
    if (typeof topic !== "string" || !topic) {
      throw new Error("위키 ROOT MAP 항목에 topic 이 없습니다.");
    }

    const title = item["title"];
    if (typeof title !== "string" || !title) {
      throw new Error("위키 ROOT MAP 항목에 title 이 없습니다.");
    }

    const summary = item["summary"];
    if (typeof summary !== "string") {
      throw new Error("위키 ROOT MAP 항목에 summary 가 없습니다.");
    }

    const hasChildren = item["hasChildren"];
    if (typeof hasChildren !== "boolean") {
      throw new Error("위키 ROOT MAP 항목에 hasChildren 가 없습니다.");
    }

    let line = `- [${title}](${topic})`;
    if (summary) line += ` — ${summary}`;
    if (hasChildren) line += " (하위 있음)";
    lines.push(line);
  }

  return lines.join("\n");
}

export function formatRootmap(rootmap: unknown): string {
  const body = formatRootmapItems(rootmap);
  return `# 지식 위키 ROOT MAP (최상위)\n\n${body ? `${body}\n` : ""}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
