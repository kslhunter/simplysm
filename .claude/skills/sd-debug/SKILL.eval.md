# Eval: sd-debug

## 행동 Eval

### 시나리오 1: 에러 메시지 분석

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
  - [ ] 증상을 에러 유형으로 분류하고 에러 메시지 원문을 인용했다
  - [ ] 에러 발생 위치(파일:라인)를 특정했다
  - [ ] 원인 가설을 2개 이상 생성했다
  - [ ] ACH 매트릭스를 작성하고 C 셀에 증거 등급(code/doc/infer)을 표시했다
  - [ ] 해결 방안에 편법/우회 목록의 항목(옵셔널 체이닝으로 undefined 무시, as any, try-catch 등)을 사용하지 않았다
  - [ ] 각 해결 방안에 장점, 반론, 관점별 점수(10점 만점)와 평균을 포함했다

### 시나리오 2: 동작 이상 분석

- 사전 조건:
  - `src/sorter.ts`:
    ```typescript
    export function sortByAge(items: { name: string; age: number }[]): { name: string; age: number }[] {
      return items.sort((a, b) => String(a.age).localeCompare(String(b.age)));
    }
    ```
- 입력: "/sd-debug sortByAge 함수에 [{name:'A',age:2},{name:'B',age:10},{name:'C',age:1}]을 넣으면 [1,10,2] 순서로 정렬됨. 기대: [1,2,10]"
- 체크리스트:
  - [ ] 기대 동작과 실제 동작을 각각 명시했다
  - [ ] 코드를 읽고 원인 가설을 2개 이상 생성했다
  - [ ] 증거 등급(C(code)/C(doc)/C(infer))을 구분하여 표시했다
  - [ ] 원인별로 해결 방안을 묶어 제시하고 각 방안에 반론을 포함했다

### 시나리오 3: 불명확한 입력

- 사전 조건: 없음
- 입력: "/sd-debug 안 돼요"
- 체크리스트:
  - [ ] 증상·위치·재현 절차 중 불명확한 항목에 대해 질문을 제시했다
  - [ ] 불명확한 정보에 대해 추측으로 원인을 단정하지 않았다
  - [ ] 질문 없이 임의로 분석을 진행하지 않았다

## 안티패턴 Eval

- [ ] 증거 없이 "~일 수 있다", "~가능성이 높다"로 원인을 단정했다
- [ ] 편법/우회 목록의 항목(setTimeout, try-catch, as any, @ts-ignore, eslint-disable, 플래그 변수, 옵셔널 체이닝으로 undefined 무시)을 해결 방안으로 제안했다
- [ ] 가설을 1개만 생성하고 ACH 매트릭스를 생략했다
- [ ] 외부 라이브러리 버그를 C(doc) 이상의 근거 없이 원인으로 지목했다
