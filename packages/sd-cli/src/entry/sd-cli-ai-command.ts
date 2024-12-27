import { SdProcess } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtils } from "@simplysm/sd-core-common";
import Anthropic from "@anthropic-ai/sdk";

export class SdCliAiCommand {
  static async commitAsync(): Promise<void> {
    if (StringUtils.isNullOrEmpty(process.env["ANTHROPIC_API_KEY"])) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.");
    }

    process.stdout.write("실행중: git add .\n");
    await SdProcess.spawnAsync("git add .", { cwd: process.cwd() });

    process.stdout.write(`실행중: git diff --staged -- . ":(exclude).*!/" ":(exclude)_*/ ":(exclude)yarn.lock" ":(exclude)packages/*/styles.css"\n`);
    const diff = await SdProcess.spawnAsync(
      `git diff --text --staged -- . ":(exclude).*" ":(exclude)_*" ":(exclude)yarn.lock" ":(exclude)packages/*/styles.css"`,
      { cwd: process.cwd() },
    );

    if (StringUtils.isNullOrEmpty(diff.trim())) {
      throw new Error("변경사항이 없습니다.");
    }

    const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

    process.stdout.write("AI를 통해 커밋 메시지 생성중...\n");
    const message = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `
다음 Git diff의 내용을 "packages"의 "서브디렉토리명"별로 분석하고, 각각에 대한 적절한 커밋메시지를 작성해줘
- "packages"의 "서브디렉토리명"별로 변경사항을 종합해서 각각 하나의 적절한 커밋메시지를 작성해줘.
- "packages"폴더의 내용이 아닌 변경사항이 있는경우, 해당 변경사항은 "프로젝트"로 적절한 커밋메시지를 작성해줘.
- "packages"폴더의 내용이 아닌 변경사항이 없는경우, "프로젝트" 커밋메시지는 필요 없어
- 각각의 커밋메시지는 코드블록으로 감싸서 답변해줘.

각 커밋메시지를 작성하는 방법:
- 한국어로 작성
- 첫줄형식: <type>(<scope>): <description>
- 첫줄은 100자 이내로 요약
- 첫줄 아래 한줄 비우고, 자세한 설명 포함
- 변경사항을 명확하고 간결하게 설명
- 수동적인 표현 대신 능동적 표현 사용

${diff}`,
        },
      ],
    });
    if (message.content[0].type !== "text") {
      throw new NeverEntryError();
    }
    // process.stdout.write(message.content[0].text);

    const messages = message.content[0].text.matchAll(/```([^`]*)```/g);
    const commitMessage = Array.from(messages).map(item => item[1].trim()).join("\n\n\n");

    await SdProcess.spawnAsync(
      `git commit -m "${commitMessage.replaceAll(/"/g, "\\\"").replaceAll(/\n/g, "\\n")}"`,
      { cwd: process.cwd() },
    );
    console.log(`git commit -m "${commitMessage.replaceAll(/"/g, "\\\"").replaceAll(/\n/g, "\\n")}"`);
    process.stdout.write("\n\n" + commitMessage + "\n\n");
    process.stdout.write("커밋이 완료되었습니다. 위 커밋메시지가 맘에들지 않을경우, 직접 커밋을 취소하세요.\n");
  }
}