import { SdProcess } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import Anthropic from "@anthropic-ai/sdk";

export class SdAiCommand {
  static async commitAsync(): Promise<void> {
    if (StringUtil.isNullOrEmpty(process.env['ANTHROPIC_API_KEY'])) {
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

    const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

    process.stdout.write("AI를 통해 커밋 메시지 생성중...\n");
    const message = await client.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `
다음 Git diff를 분석하고 적절한 커밋메시지를 작성해 주세요.
커밋 메시지는 한글로 작성하고, 첫줄은 50자 이내로 요약하고, 그 아래에 자세한 설명을 추가해 주세요.
- 형식: <type>(<scope>): <description>
- 변경사항을 명확하고 간결하게 설명
- 수동적인 표현 대신 능동적 표현 사용

${diff}`.trim(),
        },
      ],
    });
    if (message.content[0].type !== "text") {
      throw new NeverEntryError();
    }
    const messageText = message.content[0].text.trim();

    process.stdout.write("커밋 메시지:\n----\n");
    process.stdout.write(messageText + "\n----\n");

    process.stdout.write("커밋 하려면 ENTER를 입력하세요. (취소: CTRL+C)\n\n");
    await this.#waitInputEnterKey();

    process.stdout.write("커밋 중...\n");
    await SdProcess.spawnAsync(`git commit -m "${messageText}"`, { cwd: process.cwd() });

    process.stdout.write("커밋되었습니다. 푸쉬 하려면 ENTER를 입력하세요. (취소: CTRL+C)\n\n");
    await this.#waitInputEnterKey();

    process.stdout.write("푸쉬 중...\n");
    await SdProcess.spawnAsync("git push", { cwd: process.cwd() });
    await SdProcess.spawnAsync("git push --tags", { cwd: process.cwd() });

    process.stdout.write("완료\n");
    process.exit(0);
  }

  static async #waitInputEnterKey(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      process.stdin.setRawMode(true);
      process.stdin.once("data", (key) => {
        process.stdin.setRawMode(false);
        if (key.toString() === "\r" || key.toString() === "\n") resolve();
        else reject(new Error("취소되었습니다."));
      });
    });
  }
}