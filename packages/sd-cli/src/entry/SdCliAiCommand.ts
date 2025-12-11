import { SdProcess } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtils } from "@simplysm/sd-core-common";
import Anthropic from "@anthropic-ai/sdk";

export class SdCliAiCommand {
  static async commitAsync(): Promise<void> {
    if (StringUtils.isNullOrEmpty(process.env["ANTHROPIC_API_KEY"])) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.");
    }

    process.stdout.write("add 실행\n");
    await SdProcess.spawnAsync("git", ["add", "."]);

    process.stdout.write(`컨텍스트 수집\n`);
    const history = await SdProcess.spawnAsync("git", ["log", "-n", "3"]);

    const stat = await SdProcess.spawnAsync("git", ["diff", "--staged", "--stat"]);
    const diff = await SdProcess.spawnAsync("git", [
      "diff",
      "--staged",
      "--no-textconv",
      "--find-renames",
      "--find-copies",
      "--diff-algorithm=histogram",
      "--diff-filter=d",
      "--",
      ".",
      `:(exclude).*`,
      `:(exclude)_*`,
      `:(exclude)yarn.lock`,
      `:(exclude)**/package.json`,
      `:(exclude)packages/*/styles.css`,
      `:(exclude)*.map`,
    ]);

    // 삭제된 파일 목록만 따로
    const deleted = await SdProcess.spawnAsync("git", [
      "diff",
      "--staged",
      "--name-only",
      "--diff-filter=D",
    ]);

    if (StringUtils.isNullOrEmpty(diff.trim())) {
      throw new Error("변경사항이 없습니다.");
    }

    const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

    process.stdout.write(`AI를 통해 커밋 메시지 생성중...(${diff.length.toLocaleString()})\n`);
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Git 변경사항을 분석하여 한국어 커밋 메시지를 생성해줘.
          
<format>
제목: 전체 변경을 아우르는 한 줄 요약 (50자 이내)

- [패키지명] 변경 내용 1
- [패키지명] 변경 내용 2
</format>

<rules>
- 능동태 사용 (예: "추가함", "수정함", "제거함")
- 파일 단위가 아닌 기능 단위로 설명
- 커밋 메시지만 출력 (부가 설명 없이)
</rules>

<history>
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
        },
      ],
    });
    if (message.content[0].type !== "text") {
      throw new NeverEntryError();
    }

    process.stdout.write(
      "\n\n-------------------------\n" +
        message.content[0].text +
        "\n-------------------------\n\n",
    );

    await SdProcess.spawnAsync("git", ["commit", "-m", message.content[0].text]);
    process.stdout.write(
      "커밋이 완료되었습니다. 위 커밋메시지가 맘에들지 않을경우, 직접 커밋을 취소하세요.\n",
    );
  }
}
