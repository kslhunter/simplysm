/** UserPromptSubmit hook (플러그인 sd-wiki).
 *
 * 매 프롬프트 제출 시 위키 읽기·반영 두 행동을 프롬프트 옆에 재노출.
 * SessionStart 1회 주입만으론 작업 중 위키 읽기·갱신이 거의 발동되지 않으므로,
 * 관련성의 순간(매 턴)에 다시 띄워 salience 확보. 진입 경로·담을지 판단 등 상세
 * 규칙은 SessionStart 가 주입하는 wiki.md 에 위임하고, 여기선 두 행동만 짧게 상기시킨다.
 *
 * try/catch 로 격리(fail-open). 출력은 plain stdout — UserPromptSubmit 는
 * stdout 텍스트를 그대로 컨텍스트에 주입하므로, 진단/에러 로그를 stdout 에 절대
 * 찍지 않음(섞이면 컨텍스트가 오염됨). 필요한 로그는 stderr 로.
 */

import { WIKI_REMINDER } from "../shared/wiki-reminder.ts";

try {
  process.stdout.write(WIKI_REMINDER);
} catch {
  // UserPromptSubmit context 주입 실패는 프롬프트 제출을 막지 않습니다.
}
