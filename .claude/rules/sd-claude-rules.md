# 대화 규칙

- 사용자의 질문에 답변만 하라. 절대 임의로 다음단계(특히, 코드변경)로 넘어가지 않는다. 답변만 하고 사용자의 명시적 요청을 기다린다.
- 사용자의 질문이 명확하지 않으면 `.claude/rules/sd-option-scoring.md`의 규칙에 따라 명확화 한다. (절대 추측하지 않는다.)
- 사용자의 질문은 동의를 구하는것이 아니다. 무조건적 동의하려하지 말고, 비판적으로 사고하여 답변한다. 

# Compaction Rules

`/compact`수행 시, 항상 보존할 것:
- 수정된 파일의 전체 경로 목록
- 에러 메시지 원문

# Playwright

- playwright 사용시, 사용자가 접속주소를 알려주지 않았다면, 반드시 사용자에게 접속주소를 요청할것. (절대 서버를 강제로 임의 실행하지 말것)
- /playwright-cli 스킬을 사용할 것

# 문서 작성 규칙

이 규칙은 `.md` 파일을 생성하거나 수정할 때 적용한다. 대화 응답이나 코드 주석에는 적용하지 않는다.

- 섹션 제목을 `**bold**`로 표현하지 않는다. 반드시 `# header` 마크다운 헤딩을 사용한다.
  - 예: `**제목:**` (X) → `# 제목` (O), `**핵심 원칙:**` (X) → `## 핵심 원칙` (O)
  - bold는 문장 내 강조에만 사용하고, 구조적 섹션 구분에는 절대 사용하지 않는다.
- 복잡한 프로세스("반복 혹은 분기"가 3건 이상 포함)를 설명할 때는 mermaid 다이어그램으로 overview를 먼저 제시한 뒤 상세 설명을 작성한다.

# 금지 명령어

- GIT: `git stash`, `git checkout`, `git restore`, `git reset`, `git clean`은 hook(`sd-check-git.py`)이 차단한다.
- cd: `cd ...` 명령을 통한 타 폴더로의 이동을 금지한다.

# Typescript 빌드 규칙

- 절대 tsc를 emit모드로 실행하지 말것.

# 코딩 룰

- 코딩 혹은 코드예제 출력 전, 코드베이스의 기존 패턴을 확인하여 통일성있게 안내한다.
- 함수 작성 혹은 함수내 기능 추가시 단일 책임 원칙을 따른다. (함수가 이름에서 드러나지 않는 일을 몰래 해선 안됨)
- `src/`에는 프로덕션 코드만 둔다. 테스트에서만 사용하는 파일(타입 선언, 헬퍼 등)은 `tests/`에 위치시킨다.
- **barrel export 금지**: `src/` 루트의 `index.ts`를 제외하고, 하위 폴더에 re-export 전용 `index.ts`를 만들지 않는다. 패키지 루트 `index.ts`에서 개별 파일 경로를 직접 export한다.

## 자주 하는 실수

- **타입체크 명령어**: `npx tsc --noEmit` 사용 금지. 반드시 `pnpm typecheck [targets..]` 사용
- **`as any[]` 캐스팅 후 `??` 방어**: `value as any[]`로 캐스팅하면 TypeScript는 nullable이 아니라고 판단하여 `?? []`에 lint 에러 발생. `value as any[] | undefined`로 캐스팅해야 한다
- **타입 추론 해제 금지**: 타입 추론을 해제하는 방식의 수정은 절대 금지한다.
- **불필요한 `as` 캐스팅**: 가드(`target !== "client"` 등)로 타입이 좁혀진 후에는 `as SdClientPackageConfig` 같은 캐스팅 불필요. lint 에러 `no-unnecessary-type-assertion` 발생
- **타입 정의 확인 필수**: 인터페이스에 없는 프로퍼티를 추측으로 넣지 않는다. 반드시 실제 타입 정의를 읽고 작성한다
- **클래스 필드 vs prototype**: `Object.getOwnPropertyDescriptor`로 클래스 필드를 찾을 때, TypeScript 클래스 필드는 prototype이 아닌 instance에 존재한다. prototype에서 찾으면 `undefined` 반환