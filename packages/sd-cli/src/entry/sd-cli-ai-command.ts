import { SdProcess } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtils } from "@simplysm/sd-core-common";
import Anthropic from "@anthropic-ai/sdk";

export class SdCliAiCommand {
  static async commitAsync(): Promise<void> {
    if (StringUtils.isNullOrEmpty(process.env["ANTHROPIC_API_KEY"])) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.");
    }

    process.stdout.write("add 실행\n");
    await SdProcess.spawnAsync("git add .");

    process.stdout.write(`diff 실행\n`);
    const diff = await SdProcess.spawnAsync(
      `git diff --no-textconv --staged -- . ":(exclude).*" ":(exclude)_*" ":(exclude)yarn.lock" ":(exclude)packages/*/styles.css"`,
    );

    if (StringUtils.isNullOrEmpty(diff.trim())) {
      throw new Error("변경사항이 없습니다.");
    }

    const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

    process.stdout.write(`AI를 통해 커밋 메시지 생성중...(${diff.length.toLocaleString()})\n`);
    const message = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `
다음 "git diff"을 통해 변경된 사항들을 분석하고, 변경된 기능들에 대한 적절한 커밋메시지를 작성해줘
- 한국어로 작성 해줘
- 첫줄은 변경사항 모두를 아우를 수 있는 하나의 메시지로 작성해줘
- 반드시 커밋메시지만 "\`\`\`"코드블록으로 감싸서 답변해줘.
- 첫줄 아래 한줄을 비우고, 자세한 기능 목록을 "-"로 구분하여 작성해줘.
- 자세한 내용에는 모든 변경사항에 대한 설명이 누락 없이 표현되어야해
- 변경사항을 명확하고 간결하게 설명해야해
- 수동적인 표현 대신 능동적 표현을 사용해

"git diff" 내용:
${diff}`,
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

    const messages = message.content[0].text.replaceAll(/"/g, "\\\"")
      .matchAll(/```(?:\w*\n)?([\s\S]*?)```/g);
    const commitMessage = Array.from(messages)
      .map(item => item[1].trim())
      .join("\n\n\n");

    await SdProcess.spawnAsync(`git commit -m "${commitMessage}"`);
    process.stdout.write("커밋이 완료되었습니다. 위 커밋메시지가 맘에들지 않을경우, 직접 커밋을 취소하세요.\n");
  }
}