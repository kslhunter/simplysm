import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// 로컬 프로젝트 위키(.wiki/) 루트맵 빌더 — 최상위 항목만 라우팅 목록으로 만든다.
// 하위는 세션 중 온디맨드 탐색(Glob/Read). 원격 위키 ROOT MAP 과 동일한 "루트만 주입" 원리.

interface LocalWikiPageMeta {
  title?: string;
  summary?: string;
}

/** `.wiki/` 최상위 라우팅 목록을 만든다. `.wiki/` 가 없으면 undefined (미구성은 정상). */
export async function buildLocalWikiRootmap(projectDir: string): Promise<string | undefined> {
  const wikiDir = join(projectDir, ".wiki");

  let entries;
  try {
    entries = await readdir(wikiDir, { withFileTypes: true });
  } catch {
    return undefined; // .wiki 미구성 — 무주입.
  }

  const lines: string[] = [];
  for (const entry of entries.toSorted((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      // 폴더(hub)의 요약은 폴더 안 README.md frontmatter.
      const meta = await readPageMeta(join(wikiDir, entry.name, "README.md"));
      lines.push(formatItemLine(meta.title ?? entry.name, `.wiki/${entry.name}/`, meta.summary, true));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      // 루트 직속 README.md 는 .wiki 트리 자체의 hub 페이지 — 항목으로 싣지 않음.
      const meta = await readPageMeta(join(wikiDir, entry.name));
      const fallbackTitle = entry.name.replace(/\.md$/, "");
      lines.push(formatItemLine(meta.title ?? fallbackTitle, `.wiki/${entry.name}`, meta.summary, false));
    }
  }

  if (lines.length === 0) return undefined; // 실을 항목 없음 — 부재와 동일하게 무주입.
  return `## 로컬 프로젝트 위키 ROOT MAP (.wiki/ 최상위)\n\n${lines.join("\n")}`;
}

function formatItemLine(title: string, relativePath: string, summary: string | undefined, isHub: boolean): string {
  let line = `- [${title}](${relativePath})`;
  line += summary !== undefined ? ` — ${summary}` : " (요약 없음)";
  if (isHub) line += " (하위 있음)";
  return line;
}

/** frontmatter 에서 title·summary 를 읽는다. 파일이 없으면 빈 메타. */
async function readPageMeta(filePath: string): Promise<LocalWikiPageMeta> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch {
    return {};
  }

  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content)?.[1];
  if (frontmatter === undefined) return {};

  return {
    title: readFrontmatterValue(frontmatter, "title"),
    summary: readFrontmatterValue(frontmatter, "summary"),
  };
}

function readFrontmatterValue(frontmatter: string, key: string): string | undefined {
  const match = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(frontmatter);
  if (!match) return undefined;

  const value = match[1]!.trim().replace(/^(["'])(.*)\1$/, "$2");
  return value || undefined;
}
