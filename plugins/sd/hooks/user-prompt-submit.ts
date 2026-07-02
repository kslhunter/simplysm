/** UserPromptSubmit hook (플러그인 sd).
 *
 * 매 프롬프트 제출 시 응답 규칙 준수를 프롬프트 옆에 재노출.
 * SessionStart 1회 주입(sd.md)만으론 작업 중 출력 규칙이 흐려지므로,
 * 관련성의 순간(매 턴)에 다시 띄워 salience 확보. 세부 규칙은 SessionStart 가
 * 주입하는 sd.md 에 위임하고, 여기선 준수 상기만 짧게 한다.
 *
 * try/catch 로 격리(fail-open). 출력은 plain stdout — UserPromptSubmit 는
 * stdout 텍스트를 그대로 컨텍스트에 주입하므로, 진단/에러 로그를 stdout 에 절대
 * 찍지 않음(섞이면 컨텍스트가 오염됨). 필요한 로그는 stderr 로.
 */

import { RESPONSE_REMINDER } from "../shared/response-reminder.ts";

try {
  process.stdout.write(RESPONSE_REMINDER);
} catch {
  // UserPromptSubmit context 주입 실패는 프롬프트 제출을 막지 않습니다.
}
