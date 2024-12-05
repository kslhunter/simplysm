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

    const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

    process.stdout.write("AI를 통해 문제점 파악 및 커밋 메시지 생성중...\n");
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      messages: [
        {
          role: "assistant",
          content: "당신은 코드 리뷰 전문가입니다. Git diff를 분석하고 문제점과 커밋 메시지를 동시에 생성하세요.",
        },
        {
          role: "user",
          content: `
다음 Git diff를 분석하고 두 가지를 한글로 작성해 주세요:
1. 코드 변경의 문제점 및 개선점
2. Conventional Commits 규약에 따른 명확한 커밋 메시지

Git diff 내용:\n\n${diff}

분석결과 생성 가이드:
- 코드 품질, 잠재적 버그, 성능 이슈 확인

커밋 메시지 생성 가이드:
- 변경 타입(feat, fix, refactor 등) 명시
- 변경사항의 본질을 간결하게 요약

분석결과와 커밋메시지 사이에 "----"로 구분하기만 하고, 요청한 제목은 제외하고 답변하세요.`.trim(),
        },
      ],
    });
    if (message.content[0].type !== "text") {
      throw new NeverEntryError();
    }
    const messageText = message.content[0].text;
    const parts = messageText.split('----');

    process.stdout.write("문제점 및 개선점:\n----\n");
    process.stdout.write(parts[0].trim() + "\n----\n");

    process.stdout.write("커밋 메시지를 확인하려면 ENTER를 입력하세요. (취소: CTRL+C)\n\n");
    await this.#waitInputEnterKey();

    process.stdout.write("커밋 메시지:\n----\n");
    process.stdout.write(parts[1].trim() + "\n----\n");

    process.stdout.write("커밋 하려면 ENTER를 입력하세요. (취소: CTRL+C)\n\n");
    await this.#waitInputEnterKey();

    process.stdout.write("커밋 중...\n");
    await SdProcess.spawnAsync(`git commit -m "${parts[1].trim()}"`, { cwd: process.cwd() });

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