# Eval: sd-debug

## 행동 Eval

### 시나리오 1: 에러 메시지 분석 (L1 재현 가능)

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
- 체크리스트:
  - [ ] Phase 1에서 증상을 에러 유형으로 분류하고 에러 메시지 원문을 인용했다
  - [ ] Phase 1에서 에러 발생 위치(파일:라인)를 특정했다
  - [ ] Phase 2에서 재현 가능성을 L1으로 분류했다
  - [ ] Phase 2에서 직접 재현(또는 코드 트레이스)을 시도했다
  - [ ] Phase 3에서 Fishbone 6축 중 최소 3개 카테고리에 가설 ≥3개를 생성했다
  - [ ] Phase 4에서 ACH 매트릭스를 구성하고 C(code)/C(doc)/C(infer)/I/N 등급으로 평가했다
  - [ ] Phase 4에서 I 표시된 가설만 폐기하고, 추론에 의한 I 표시를 하지 않았다
  - [ ] Phase 5에서 분기형 5 Whys로 ROOT를 추적했고, 매 단계 ≥2 분기 후보를 나열했다
  - [ ] Phase 7 보고에 ACH 매트릭스, 폐기된 가설, 5 Whys 트리 전체, 검증 도구 사용 과정을 노출하지 않았다
  - [ ] Phase 7 보고 첫 줄에 확정 원인을 한 문장으로 결론지었다
  - [ ] 원인의 근거를 `파일:라인` 인용 + 코드블록으로 제시했다
  - [ ] 해결책에 위치(파일:라인 또는 심볼)와 변경 방향(현재 → 변경)을 구체적으로 명시했다
  - [ ] 권장 해결책에 위험·반론을 함께 적었다
  - [ ] 해결 방안에 편법/우회 목록의 항목(옵셔널 체이닝으로 undefined 무시, as any, try-catch 등)을 사용하지 않았다
  - [ ] 보고 후 즉시 종료했고, 후속 스킬을 자동 호출하지 않았다
  - [ ] 별도 파일을 생성하지 않았다

### 시나리오 2: 동작 이상 분석 (L1)

- 사전 조건:
  - `src/sorter.ts`:
    ```typescript
    export function sortByAge(items: { name: string; age: number }[]): { name: string; age: number }[] {
      return items.sort((a, b) => String(a.age).localeCompare(String(b.age)));
    }
    ```
- 입력: "/sd-debug sortByAge 함수에 [{name:'A',age:2},{name:'B',age:10},{name:'C',age:1}]을 넣으면 [1,10,2] 순서로 정렬됨. 기대: [1,2,10]"
- 체크리스트:
  - [ ] Phase 1에서 기대 동작과 실제 동작을 각각 명시했다
  - [ ] Phase 2에서 L1으로 분류하고 직접 재현을 시도했다
  - [ ] Phase 3에서 Fishbone 6축으로 가설 ≥3개를 생성했다
  - [ ] Phase 4에서 ACH 매트릭스 + 증거 등급(C(code)/C(doc)/C(infer))으로 검증했다
  - [ ] Phase 5에서 분기형 5 Whys로 ROOT까지 추적했다 (매 단계 ≥2 분기)
  - [ ] Phase 7 보고에 ACH 매트릭스, 5 Whys 트리, 폐기된 가설, 검증 도구 사용 과정을 노출하지 않았다
  - [ ] Phase 7 보고 첫 줄에 확정 원인을 한 문장으로 결론지었다
  - [ ] 원인의 근거를 `파일:라인` 인용 + 코드블록으로 제시했다
  - [ ] 해결책에 위치와 변경 방향(현재 → 변경)을 구체적으로 명시하고 위험·반론을 함께 적었다
  - [ ] 보고 후 즉시 종료했고, 후속 스킬을 자동 호출하지 않았다
  - [ ] 별도 파일을 생성하지 않았다

### 시나리오 3: 불명확한 입력

- 사전 조건: 없음
- 입력: "/sd-debug 안 돼요"
- 체크리스트:
  - [ ] Phase 1에서 증상·위치·재현 절차 중 불명확한 항목에 대해 질문을 제시했다
  - [ ] 불명확한 정보에 대해 추측으로 원인을 단정하지 않았다
  - [ ] 질문 없이 임의로 분석을 진행하지 않았다 (Phase 3 가설 발산으로 직행 금지)
  - [ ] `/sd-inner-clarify` 스킬을 호출하여 명확화를 시도했다
  - [ ] 별도 파일을 생성하지 않았다

### 시나리오 4: L1 재현 + Delta Debugging

- 사전 조건:
  - `tests/parser.test.ts`가 10000행 CSV로 실행 시 실패
  - 작은 CSV(1~10행)로는 통과
- 입력: "/sd-debug tests/parser.test.ts가 10000행 CSV에서만 실패함. 어떤 행이 원인인지 모르겠음"
- 체크리스트:
  - [ ] Phase 2에서 L1으로 분류하고 직접 재현을 시도했다
  - [ ] Phase 2-2에서 Delta Debugging 알고리즘으로 1-minimal 케이스로 좁혔다
  - [ ] 좁힌 minimal 케이스를 ACH 매트릭스의 증거로 등록했다
  - [ ] Phase 3에서 좁힌 케이스의 특성에 기반한 Fishbone 가설 ≥3개를 생성했다
  - [ ] Phase 5에서 분기형 5 Whys로 ROOT 추적했다
  - [ ] Phase 7 보고에 minimal 케이스, ROOT, 해결책, 회귀 테스트 등록 제안을 포함했다
  - [ ] Delta Debugging 과정 자체는 보고에 노출하지 않았다 (살아남은 결론만)

### 시나리오 5: L2~L5 재현 불가 (사용자 환경/하드웨어 의존)

- 사전 조건:
  - 사용자가 모바일 앱(Capacitor)에서 USB 스토리지 접근 시 가끔 실패한다고 보고
- 입력: "/sd-debug 안드로이드 디바이스에서 USB 메모리 꽂으면 가끔 파일 목록이 빈 배열로 나와요. 매번은 아니고 10번 중 3번 정도"
- 체크리스트:
  - [ ] Phase 2-1에서 L3 (하드웨어 의존) + L4 (간헐 발생)로 복수 분류했다
  - [ ] Phase 2-3에서 사용자에게 디바이스 로그(`adb logcat`), 디바이스 모델/OS, 재현 빈도, 발생 시점 패턴 등을 단일 질문으로 묶어 요청했다
  - [ ] LLM이 직접 재현할 수 없음을 명시했다
  - [ ] Phase 2-4의 트레이스 시뮬레이션(코드 트레이스/로직 분석/타입 체크)으로 가설을 좁혔다
  - [ ] Phase 4 ACH에서 C(infer) 비중이 높음을 인정하고, C(infer) → C(code)/C(doc) 승격을 위한 추가 데이터 요청을 시도했다
  - [ ] 살아남은 가설이 복수면 모두 보고했고, 단정적 결론을 피했다
  - [ ] Phase 7 보고의 "분석 한계" 섹션에 "직접 재현 못 함", "사용자 보고에 의존한 증거" 등을 분리해 적었다
  - [ ] 외부 의존 가설(예: "Capacitor 플러그인 버그")을 C(doc) 이상의 근거(GitHub 이슈, changelog, 소스코드) 없이 채택하지 않았다

### 시나리오 6: 복합 인과 (FTA 적용)

- 사전 조건:
  - 통합 테스트가 동시 실행 시에만 실패하고 단일 실행 시에는 성공
  - 풀 사이즈를 1로 줄이면 발생 안 함
- 입력: "/sd-debug 통합 테스트가 동시 실행할 때만 깨짐. 단일이면 통과. 커넥션 풀 사이즈 1로 줄이면 통과"
- 체크리스트:
  - [ ] Phase 2에서 L1 + L4 (간헐 발생, 동시성 의존)로 분류했다
  - [ ] Phase 4 ACH에서 동시성/풀/트랜잭션 가설을 평가했다
  - [ ] Phase 5에서 단일 ROOT가 아닌 *복합 인과* 임을 인식했다
  - [ ] Phase 6 FTA로 진입하여 AND/OR 게이트로 결합 형태를 명시했다
  - [ ] AND/OR 판단을 위해 "한쪽 ROOT만 제거 시 재현되는가" 검증을 수행하거나 사용자에게 확인 요청했다
  - [ ] Phase 7 보고에 "복합 원인" 섹션으로 결합 형태와 해결 우선순위를 명시했다

## 안티패턴 Eval

다음 항목 중 하나라도 발견되면 fail.

- [ ] 증거 없이 "~일 수 있다", "~가능성이 높다"로 원인을 단정했다
- [ ] 편법/우회 목록의 항목(setTimeout, try-catch, as any, @ts-ignore, eslint-disable, 플래그 변수, 옵셔널 체이닝으로 undefined 무시)을 해결 방안으로 제안했다
- [ ] Phase 3에서 가설을 1~2개만 생성하고 ACH 검증을 생략했다 (≥3개 강제)
- [ ] Phase 4 ACH 매트릭스 구성 없이 가설을 곧장 결론으로 채택했다
- [ ] Phase 5에서 분기 후보를 1개만 나열하고 종축으로 직행했다 (≥2 분기 강제)
- [ ] Phase 5의 결과를 곧 ROOT로 채택하지 않고 표면 원인에서 멈췄다
- [ ] 외부 라이브러리 버그를 C(doc) 이상의 근거(GitHub 이슈, changelog, 소스코드) 없이 원인으로 지목했다
- [ ] L2~L5 모드에서 사용자에게 정보 요청 없이 C(infer)만으로 결론을 단정했다
- [ ] L1에서 직접 재현 시도 없이 가설 단계로 직행했다
- [ ] 보고에 ACH 매트릭스, 5 Whys 트리, 폐기된 가설, 검증 도구 사용 과정을 노출했다
- [ ] 사용자 지시 없이 후속 스킬(`/sd-dev`, `/sd-tdd` 등)을 자동으로 호출했다
- [ ] `debug.md` 등 별도 파일을 생성했다
- [ ] 분석 모드(분석 요청)인데 코드를 직접 수정했다 (진단용 print/assert 삽입 포함)
- [ ] 추론에 의한 I 표시로 가설을 폐기했다 (코드/문서에서 직접 관찰된 모순만 I 가능)
