import { SdProcess } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import Anthropic from "@anthropic-ai/sdk";

export class SdAiCommand {
  static async commitMessageAsync(): Promise<void> {
    if (StringUtil.isNullOrEmpty(process.env["ANTHROPIC_API_KEY"])) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.");
    }

    process.stdout.write("실행중: git add .\n");
    await SdProcess.spawnAsync("git add .", { cwd: process.cwd() });

    process.stdout.write(`실행중: git diff --staged -- . ":(exclude).*/" ":(exclude)_*/ ":(exclude)yarn.lock" ":(exclude)packages/*/styles.css"\n`);
    const diff = await SdProcess.spawnAsync(
      `git diff --staged -- . ":(exclude).*" ":(exclude)_*" ":(exclude)yarn.lock" ":(exclude)packages/*/styles.css"`,
      { cwd: process.cwd() },
    );

    if (StringUtil.isNullOrEmpty(diff.trim())) {
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
다음 Git diff를 분석하고, 변경사항 각각에 대한 적절한 커밋메시지를 작성해 주세요.
각각에 커밋메시지에 대해 어떤 파일들을 포함하는지도 알려주세요.
서로 다른 커밋에 같은파일이 포함되지는 않도록 해주세요. 
커밋 메시지는 한글로 작성하고, 첫줄은 50자 이내로 요약하고, 그 아래에 자세한 설명을 추가해 주세요.
- 형식: <type>(<scope>): <description>
- 변경사항을 명확하고 간결하게 설명
- 수동적인 표현 대신 능동적 표현 사용

${diff}`,
        },
      ],
    });
    if (message.content[0].type !== "text") {
      throw new NeverEntryError();
    }
    process.stdout.write(message.content[0].text);
  }
}