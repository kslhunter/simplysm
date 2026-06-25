import { createLogger, env, str } from "@simplysm/core-common";
import { cpx } from "@simplysm/core-node";
import OpenAI from "openai";

/**
 * 워크스페이스의 모든 변경을 staging 한 뒤, OpenAI로 커밋 메시지를 생성해 자동 커밋한다.
 * @throws OPENAI_API_KEY 미설정, 변경사항 없음, 메시지 생성 실패 시 Error
 */
export async function runCommit(): Promise<void> {
  const logger = createLogger("sd:cli:commit");

  const apiKey = env("OPENAI_API_KEY");
  if (str.isNullOrEmpty(apiKey)) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  logger.info("변경사항 staging 중...");
  await cpx.spawn("git", ["add", "-A"]);

  logger.debug("컨텍스트 수집 중...");
  const { stdout: history } = await cpx.spawn("git", ["log", "-n", "3"]);
  const { stdout: stat } = await cpx.spawn("git", ["diff", "--staged", "--stat"]);
  // AI 입력용 diff — 추적되는 락파일·버전 범프(package.json) 노이즈만 제외 (실제 커밋은 전체 포함)
  const { stdout: diff } = await cpx.spawn("git", [
    "diff",
    "--staged",
    "--no-textconv",
    "--find-renames",
    "--find-copies",
    "--diff-algorithm=histogram",
    "--diff-filter=d",
    "--",
    ".",
    ":(exclude)pnpm-lock.yaml",
    ":(exclude)**/package.json",
  ]);
  // 삭제된 파일 목록만 따로
  const { stdout: deleted } = await cpx.spawn("git", [
    "diff",
    "--staged",
    "--name-only",
    "--diff-filter=D",
  ]);

  if (str.isNullOrEmpty(diff.trim())) {
    throw new Error("변경사항이 없습니다.");
  }

  const client = new OpenAI({ apiKey });

  logger.info(`AI 커밋 메시지 생성 중... (${diff.length.toLocaleString()})`);
  const res = await client.responses.create({
    model: "gpt-5-nano",
    reasoning: { effort: "low" },
    instructions: `당신은 Git 변경사항을 분석해 한국어 커밋 정보를 추출하는 도구다.
출력은 정해진 JSON 구조(title, blocks)로만 제공한다. 커밋 메시지의 줄바꿈·헤더·bullet 포맷팅은 호출 측 코드가 담당하므로, 너는 데이터 필드만 채운다.

[분류·작성 규칙]
- 각 변경을 conventional commits 분류(<type>)로 묶는다: feat·fix·refactor·docs·chore·test·build·ci·style·perf
- title: 전체를 아우르는 제목 한 줄.
  - blocks 가 1개(단일 type): "<type>: 요약" 형태.
  - blocks 가 여러 개(복수 type): 각 type 요약을 '및'·',' 로 병합한 "<typeA> 및 <typeB>: ..." 형태.
- blocks: 변경 유형별 항목. 각 block 은 type(분류), summary(해당 type 한 줄 요약), items(변경 항목 목록).
  - items 는 능동태("추가함"·"수정함"·"제거함")로, 파일 단위가 아닌 기능 단위로 작성.
- 전체 요약·메타 설명·참고 문구를 별도로 만들지 말 것. 정의된 필드 외의 텍스트는 출력하지 않는다.`,
    input: `<history>
${history.trim()}
</history>

<stat>
${stat}
</stat>

<diff>
${diff}
</diff>

<deleted_files>
${deleted.trim() || "없음"}
</deleted_files>`,
    text: {
      format: {
        type: "json_schema",
        name: "commit_message",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description:
                "커밋 제목 한 줄. 단일 type 은 '<type>: 요약', 복수 type 은 각 요약을 '및'·',' 로 병합.",
            },
            blocks: {
              type: "array",
              description: "변경 유형별 블록. 단일 유형이면 1개.",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "feat",
                      "fix",
                      "refactor",
                      "docs",
                      "chore",
                      "test",
                      "build",
                      "ci",
                      "style",
                      "perf",
                    ],
                  },
                  summary: { type: "string", description: "해당 type 의 한 줄 요약" },
                  items: {
                    type: "array",
                    items: { type: "string" },
                    description: "변경 항목. 능동태, 기능 단위.",
                  },
                },
                required: ["type", "summary", "items"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "blocks"],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = JSON.parse(res.output_text) as {
    title: string;
    blocks: { type: string; summary: string; items: string[] }[];
  };
  const message =
    parsed.blocks.length <= 1
      ? parsed.title.trim()
      : parsed.title.trim() +
        "\n\n" +
        parsed.blocks
          .map((b) => `[${b.type}]: ${b.summary}\n` + b.items.map((it) => `- ${it}`).join("\n"))
          .join("\n\n");
  if (str.isNullOrEmpty(message)) {
    throw new Error("AI가 커밋 메시지를 생성하지 못했습니다.");
  }

  logger.info("\n-------------------------\n" + message + "\n-------------------------");

  await cpx.spawn("git", ["commit", "-m", message]);
  logger.success("커밋이 완료되었습니다. 메시지가 맘에 들지 않으면 직접 커밋을 취소하세요.");
}
