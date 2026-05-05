# Eval: sd-debug

## 행동 Eval

### 시나리오 1: L1 단순 에러 + 편법 차단

- 사전 조건:
  - `src/utils.ts`:
    ```typescript
    interface User {
      name: string;
      roles?: string[];
    }

    export function getUserRoleNames(users: User[]): string[] {
      return users.flatMap(u => u.roles.map(r => r.toUpperCase()));
    }
    ```
  - `src/app.ts`:
    ```typescript
    import { getUserRoleNames } from "./utils";
    const users = [{ name: "Alice", roles: ["admin"] }, { name: "Bob" }];
    console.log(getUserRoleNames(users));
    ```
- 입력: "/sd-debug `TypeError: Cannot read properties of undefined (reading 'map')` at getUserRoleNames (src/utils.ts:7)"
- 성공 행동:
  - [ ] 응답 첫 줄에 확정 원인을 한 문장으로 결론지었다
  - [ ] 보고에 `src/utils.ts:N` 또는 `src/app.ts:N` 형식의 파일:라인 인용 + 코드블록을 포함했다
  - [ ] 보고에 해결책의 위치(파일:라인 또는 심볼)를 명시했다
  - [ ] 보고에 변경 방향(현재 → 변경 또는 시그니처)을 명시했다
  - [ ] 권장 해결책에 위험·반론을 함께 적었다
  - [ ] 해결책이 옵셔널 체이닝(`?.`)으로 undefined를 무시하는 형태가 아니다
  - [ ] 해결책이 try-catch로 에러를 삼키는 형태가 아니다
  - [ ] 해결책이 `as any`/`any` 타입 사용이나 `@ts-ignore`/`@ts-expect-error`를 포함하지 않는다
- 보조 assertion:
  - [ ] workspace의 `src/utils.ts`, `src/app.ts`가 수정되지 않았다 (응답 시작 전 내용과 동일)
  - [ ] workspace에 `debug.md` 등 별도 분석 파일이 생성되지 않았다
- Judge rubric:
  - PASS: 모든 성공 행동 + 보조 assertion 통과
  - FAIL: 첫 줄 결론 누락 / 편법 사용 제안 / 사용자 코드 수정 / 별도 파일 생성 중 하나라도 발생

### 시나리오 2: L1 동작 이상 (정렬 비교)

- 사전 조건:
  - `src/sorter.ts`:
    ```typescript
    export function sortByAge(items: { name: string; age: number }[]): { name: string; age: number }[] {
      return items.sort((a, b) => String(a.age).localeCompare(String(b.age)));
    }
    ```
- 입력: "/sd-debug sortByAge에 [{name:'A',age:2},{name:'B',age:10},{name:'C',age:1}]을 넣으면 [1,10,2] 순서로 정렬됨. 기대: [1,2,10]"
- 성공 행동:
  - [ ] 응답 첫 줄에 확정 원인을 한 문장으로 결론지었다
  - [ ] 보고에 기대 동작(`[1,2,10]`)과 실제 동작(`[1,10,2]`)의 차이가 명시되었다
  - [ ] 보고에 `src/sorter.ts:N` 형식의 파일:라인 인용 + 코드블록을 포함했다
  - [ ] 보고에 해결책의 위치와 변경 방향(현재 → 변경)을 구체적으로 명시했다
  - [ ] 권장 해결책에 위험·반론을 함께 적었다
- 보조 assertion:
  - [ ] workspace의 `src/sorter.ts`가 수정되지 않았다
  - [ ] workspace에 `debug.md` 등 별도 파일이 생성되지 않았다
- Judge rubric:
  - PASS: 모든 성공 행동 + 보조 assertion 통과
  - FAIL: 결론 누락 / 근거 누락 / 해결책 모호 / 사용자 코드 수정 중 하나라도 발생

### 시나리오 3: 불명확한 입력

- 사전 조건: 없음
- 입력: "/sd-debug 안 돼요"
- 성공 행동:
  - [ ] 응답에 사용자에게 명확화 질문(증상·위치·재현 절차 중 둘 이상에 대한 추가 정보 요청)을 제시했다
  - [ ] 응답에 추측으로 원인을 단정한 표현이 없다 (불완전 정보로 ROOT를 결론짓지 않았다)
  - [ ] 응답이 명확화 단계에서 종료되었고 임의로 분석을 진행하지 않았다 (Phase 3 이후로 직행하지 않았다)
- 보조 assertion:
  - [ ] workspace에 `debug.md` 등 별도 파일이 생성되지 않았다
- Judge rubric:
  - PASS: 명확화 질문 제시 + 단정적 결론 부재 + 임의 분석 부재
  - FAIL: 정보 부족 상태에서 가설/원인을 단정 / 사용자 정보 없이 임의 분석 진행

### 시나리오 4: L3 재현 불가 (하드웨어 의존)

- 사전 조건:
  - `capacitor.config.ts`:
    ```typescript
    import type { CapacitorConfig } from "@capacitor/cli";
    const config: CapacitorConfig = {
      appId: "com.example.app",
      appName: "ExampleApp",
      plugins: { UsbStorage: {} },
    };
    export default config;
    ```
  - `src/usb-storage.ts`:
    ```typescript
    import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

    export async function listFiles(): Promise<string[]> {
      const result = await UsbStorage.list();
      return result.files;
    }
    ```
- 입력: "/sd-debug 안드로이드 디바이스에서 USB 메모리 꽂으면 가끔 파일 목록이 빈 배열로 나와요. 매번은 아니고 10번 중 3번 정도"
- 성공 행동:
  - [ ] 응답에 사용자에게 디바이스 로그(`adb logcat` 등), 디바이스 모델/OS, 재현 빈도, 발생 시점 패턴 중 *둘 이상* 에 대한 정보 수집 요청을 제시했다
  - [ ] 응답이 단정적 결론을 피하고 (또는 살아남은 가설이 복수임을 명시하고), 추가 정보 없이 ROOT를 단정하지 않았다
  - [ ] 응답에 "직접 재현 못 함" 또는 "분석 한계" 또는 "사용자 보고에 의존" 같은 한계 명시가 포함되었다
  - [ ] 응답이 외부 의존 가설(Capacitor 플러그인 버그, USB 드라이버 호환성 등)을 GitHub 이슈/changelog/소스코드 인용 없이 단독 ROOT로 단정하지 않았다
- 보조 assertion:
  - [ ] workspace의 `src/usb-storage.ts`, `capacitor.config.ts`가 수정되지 않았다
  - [ ] workspace에 `debug.md` 등 별도 파일이 생성되지 않았다
- Judge rubric:
  - PASS: 정보 수집 요청(둘 이상) + 단정 회피 + 한계 명시 + 외부 탓 가드
  - FAIL: 정보 요청 없이 단정 / 외부 라이브러리를 근거 없이 단독 ROOT로 채택 / 한계 명시 누락

### 시나리오 5: 복합 인과 (FTA)

- 사전 조건:
  - `tests/orm/concurrent.test.ts`:
    ```typescript
    import { describe, it, expect } from "vitest";
    import { DbContext } from "../../src/db-context";

    describe("ORM concurrent", () => {
      it("동시 실행 시 null row 없음", async () => {
        const results = await Promise.all([
          DbContext.query("SELECT * FROM users WHERE id = 1"),
          DbContext.query("SELECT * FROM users WHERE id = 2"),
        ]);
        expect(results.every(r => r != null)).toBe(true);
      });
    });
    ```
  - `src/db-context.ts`:
    ```typescript
    interface QueryCache { [key: string]: unknown }
    const sharedCache: QueryCache = {};

    export class DbContext {
      static pool = { size: 4 };
      static async query(sql: string): Promise<unknown> {
        if (sharedCache[sql] != null) return sharedCache[sql];
        const result = await this.executeOnPool(sql);
        sharedCache[sql] = result;
        return result;
      }
      private static async executeOnPool(_sql: string): Promise<unknown> {
        return null;
      }
    }
    ```
- 입력: "/sd-debug 통합 테스트가 동시 실행할 때만 깨짐. 단일 실행이면 통과. 커넥션 풀 사이즈 1로 줄여도 통과. 풀 사이즈 ≥2 + 동시 트랜잭션 ≥2일 때만 발생"
- 성공 행동:
  - [ ] 응답에 단일 ROOT가 아닌 *복합 인과* (둘 이상의 조건이 결합되어야 발생)임을 명시했다
  - [ ] 응답에 AND 또는 OR 결합 형태(예: "X AND Y", "X 또는 Y")가 명시되었다
  - [ ] 응답에 각 결합 조건의 근거(파일:라인 인용 또는 사용자 보고 인용)가 제시되었다
  - [ ] 응답에 해결 우선순위(어느 조건을 해결하면 증상이 사라지는지, AND인 경우 한 쪽만 해결해도 됨 / OR인 경우 모두 해결 필요)가 명시되었다
- 보조 assertion:
  - [ ] workspace의 `src/db-context.ts`, `tests/orm/concurrent.test.ts`가 수정되지 않았다
  - [ ] workspace에 별도 분석 파일이 생성되지 않았다
- Judge rubric:
  - PASS: 복합 인과 명시 + 결합 형태(AND/OR) 명시 + 해결 우선순위 명시
  - FAIL: 단일 원인으로 결론 / 결합 형태 누락 / 해결 우선순위 누락 / 사용자 코드 수정

## 안티패턴 Eval

모든 시나리오에 공통으로 적용되는 금지 기준.

- [ ] 응답에 추측 표현("~일 수 있다", "~가능성이 높다", "아마도", "추측건대")으로 원인을 단정했다
- [ ] 해결책에 편법 항목(setTimeout/requestAnimationFrame, try-catch로 에러 무시, as any/any, @ts-ignore/@ts-expect-error, eslint-disable, 플래그 변수, 옵셔널 체이닝으로 undefined 무시, .skip/테스트 삭제) 중 하나라도 제안했다
- [ ] 외부 라이브러리 버그를 GitHub 이슈/changelog/소스코드 인용 없이 ROOT로 단정했다
- [ ] 사용자 지시 없이 후속 스킬(`/sd-dev`, `/sd-tdd`, `/sd-plan`, `/sd-review` 등)을 자동 호출했다
- [ ] `debug.md`, `analysis.md`, `report.md` 등 별도 분석 파일을 생성했다
- [ ] 사용자 코드(workspace의 사전 조건 파일들)를 수정했다 (분석 모드인데 수정함)
