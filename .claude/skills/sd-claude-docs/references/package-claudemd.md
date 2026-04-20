# 패키지별 CLAUDE.md 생성 지침

이 문서는 모노레포의 개별 패키지에 대한 CLAUDE.md를 생성하는 subagent를 위한 지침이다.

## 병합 규칙

`{패키지 경로}/CLAUDE.md`가 이미 존재하면, 먼저 Read로 읽어 기존 섹션을 파악한다. 새 콘텐츠 생성 후 아래 규칙으로 병합한다:
1. 동일 주제의 기존 섹션 → 새 콘텐츠로 대체
2. 대응 섹션이 없는 기존 섹션 → 그대로 보존
3. 기존 섹션의 위치를 유지하고, 새 섹션은 마지막 기존 섹션 뒤에 추가

기존 파일이 없으면 병합을 건너뛴다.

## 최상단 안내 문구 (필수)

CLAUDE.md의 **제목(`# CLAUDE.md`) 바로 아래**, 모든 본문 섹션보다 앞에 아래 인용 블록을 삽입한다. 이미 존재하면 갱신하지 않고 그대로 둔다.

```markdown
> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.
```

예외: 해당 패키지가 `private: true`여서 README.md / docs/가 생성되지 않는 경우 이 문구를 삽입하지 않는다.

## 분석 대상

1. `package.json` — 이름, 설명, dependencies
2. `tsconfig.json` — 패키지 고유 컴파일러 옵션
3. `src/` 디렉토리 구조 — Glob으로 파일 목록 확인 후 트리 구조 파악
4. 소스 코드 — 주요 파일을 Read하여 반복되는 패턴(클래스 구조, 함수 시그니처, 데코레이터 사용 등) 식별
5. 테스트 디렉토리 — 존재하면 테스트 패턴과 규칙 분석

## 포함할 섹션

- **Package Overview**: 패키지명, 한 줄 설명, 소스 파일 수
- **Architecture**: `src/` 하위 디렉토리 구조를 트리로 표현, 각 디렉토리의 역할 설명
- **Key Patterns**: 소스 코드에서 반복되는 패턴을 코드 예시와 함께 기술. 패턴이 여러 개면 하위 섹션(`###`)으로 분리
- **Testing**: 테스트 디렉토리가 있으면 테스트 구조, 패턴, 규칙 기술. 없으면 섹션 생략
- 그 외 패키지 고유 정보 (예: 스타일링, 컴파일러 설정 등)

## 제외할 내용 (루트 CLAUDE.md에만 포함)

- 명령어 (pnpm scripts)
- 프로젝트 전체 코딩 규칙 (lint, prettier 등)
- 패키지 매니저 정보
- 프로젝트 전체 기술 스택
- 루트와 동일한 컴파일러/빌드 설정 — 패키지에만 고유한 설정만 기술한다

## 형식

CLAUDE.md는 반드시 대화언어로 작성한다. 모호한 표현("적절히", "필요에 따라", "상황에 따라")을 사용하지 않는다.

## 참고 예시

아래는 패키지별 CLAUDE.md의 **구조와 스타일** 참고 예시다. 실제 내용은 대상 패키지에 맞게 작성한다.

````markdown
# CLAUDE.md

> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@scope/package-name` - 한 줄 설명. 42 TypeScript source files across core and utilities.

## Architecture

```
src/
├── core/         ← 핵심 로직: services(5), models(3)
├── utils/        ← 유틸리티 함수
└── index.ts      ← public API re-exports
```

### Bootstrap

`initialize()` (`core/init.ts`)이 기반을 설정:
- 설정 로드
- 서비스 등록

## Key Patterns

### Service Structure

모든 서비스가 따르는 공통 패턴:

```typescript
@Injectable()
export class FooService {
  private readonly config = inject(ConfigProvider);

  async execute(input: FooInput): Promise<FooOutput> {
    // ...
  }
}
```

### Utility Functions

`src/utils/`의 순수 함수들. 사이드 이펙트 없음:

- `transformX()` — X 데이터 변환
- `validateY()` — Y 유효성 검증

## Testing

**프레임워크**: Vitest

테스트 디렉토리가 src 구조를 미러링: `tests/core/`, `tests/utils/`

```typescript
describe("FooService", () => {
  it("should ...", () => {
    const svc = new FooService(mockConfig);
    expect(svc.execute(input)).resolves.toEqual(expected);
  });
});
```
````
