import { SdProcess } from "@simplysm/sd-core-node";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import Anthropic from "@anthropic-ai/sdk";

/**
 * AI를 활용한 Git 커밋 관련 기능을 제공하는 클래스입니다.
 *
 * @example
 * ```ts
 * // Git 변경사항을 분석하고 커밋 메시지를 자동 생성
 * await SdAiCommand.commitAsync();
 * ```
 *
 * @remarks
 * - 실행을 위해서는 ANTHROPIC_API_KEY 환경변수가 설정되어 있어야 합니다.
 * - Claude AI를 활용하여 코드 변경사항을 분석하고 Conventional Commits 규약에 맞는 커밋 메시지를 생성합니다.
 * - 분석 결과에는 코드 품질, 잠재적 버그, 성능 이슈 등이 포함됩니다.
 */
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

    process.stdout.write("AI를 통해 문제점 파악 및 커밋 메시지 생성중...\n");
    const message = await client.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      system: "당신은 코드 리뷰 전문가입니다",
      messages: [
        {
          role: "user",
          content: `
다음 Git diff를 분석하고 두 가지를 한글로 작성해 주세요:

1. [문제점] 섹션:
- 코드 품질, 잠재적 버그, 성능 이슈, 보안 취약점에 대한 수정 제안사항을 파일별로 간결하게 설명

2. [커밋메시지] 섹션:
- 형식: <type>(<scope>): <description>
- 변경사항을 명확하고 간결하게 설명
- 한글로 작성
- 수동적인 표현 대신 능동적 표현 사용
- packages폴더내 패키지별로 작성

Git diff 내용:\n\n${diff}

추가정보:
- 문제점과 커밋메시지를 위의 섹션 제목으로 구분하세요.`.trim(),
        },
      ],
    });
    if (message.content[0].type !== "text") {
      throw new NeverEntryError();
    }
    const messageText = message.content[0].text;
    const parts = messageText.split(/\[문제점]:?|\[커밋메시지]:?/);

    process.stdout.write("코드 변경의 문제점:\n----\n");
    process.stdout.write((parts[1]?.trim() || "문제점 없음") + "\n----\n");

    process.stdout.write("커밋 메시지를 확인하려면 ENTER를 입력하세요. (취소: CTRL+C)\n\n");
    await this.#waitInputEnterKey();

    process.stdout.write("커밋 메시지:\n----\n");
    process.stdout.write((parts[2]?.trim() || "커밋 메시지 없음") + "\n----\n");

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