---
description: TSDoc 주석 작성/업데이트
argument-hint: [패키지명 | 파일경로] [--missing | --update | --check | --all]
---

# /sd:tsdoc - TSDoc 주석 작성

$ARGUMENTS

public API에 TSDoc 주석을 작성하거나 업데이트한다.

> 📖 고급 TSDoc 패턴: [tsdoc-patterns.md](../../references/tsdoc-patterns.md)

## 트리거

- TSDoc 주석 작성/업데이트 요청
- API 문서화
- 주석 누락 검사

## 인수 파싱

| 인수 | 설명 |
|------|------|
| `{패키지명}` | 대상 패키지 (예: `core-common`) |
| `{파일경로}` | 특정 파일 경로 |
| `--missing` | TSDoc 없는 항목만 (기본값) |
| `--update` | 기존 TSDoc도 재작성 |
| `--check` | 검사만 (수정 없음) |
| `--all` | 전체 활성 패키지 |

대상 생략 시 선택 프롬프트.

## TSDoc 대상

| 대상 | 조건 |
|------|------|
| 함수 | `export` 된 것만 |
| 클래스 | `export` + public 메서드/속성 |
| 인터페이스 | `export` 된 것만 |
| 타입 | `export` 된 것만 |
| 상수 | `export` 된 것만 |

**제외**: private 멤버, 내부 헬퍼, `_` 접두사 항목

## 실행 절차

### 1. 대상 결정

- `{패키지명}` → `packages/{name}/src/**/*.ts`
- `{파일경로}` → 해당 파일만
- `--all` → 전체 활성 패키지 (레거시 제외)
  - **패키지가 5개 이상**: `doc-writer` 에이전트(Task tool)로 패키지별 병렬 처리
- 생략 → 패키지 목록 표시 후 선택

### 2. 분석

#### 2-1. export 목록 파악
- `src/index.ts`에서 export 구조 확인
- 각 파일의 export된 항목 수집

#### 2-2. TSDoc 상태 확인
- `/** ... */` 형태의 JSDoc/TSDoc 유무 체크
- `--missing`: 없는 항목만 수집
- `--update`: 모든 항목 수집

### 3. TSDoc 생성

항목별 TSDoc 템플릿:

```typescript
// 함수
/**
 * {함수 설명}
 *
 * @param {파라미터명} - {파라미터 설명}
 * @returns {반환값 설명}
 * @throws {에러 조건} (있는 경우)
 *
 * @example
 * ```typescript
 * {사용 예시}
 * ```
 */

// 클래스
/**
 * {클래스 설명}
 *
 * @example
 * ```typescript
 * {사용 예시}
 * ```
 */

// 인터페이스/타입
/**
 * {설명}
 */
```

### 4. 적용

- `--check` → 수정 없이 누락 목록만 출력
- 그 외 → `Edit` 도구로 TSDoc 삽입

### 5. 결과 보고

```markdown
# TSDoc 작성 완료

## 요약
| 항목 | 수 |
|------|-----|
| 처리 파일 | 12 |
| 추가된 TSDoc | 45 |
| 스킵 (이미 존재) | 23 |

## 상세
### 추가됨
- `src/utils/string.ts`: formatString, parseTemplate
- `src/types/common.ts`: Options, Config

### 스킵됨 (--check 시)
- `src/utils/date.ts:15` - formatDate() 누락
```

## 예외 처리

| 상황 | 대응 |
|------|------|
| 패키지/파일 없음 | 사용 가능한 대상 목록 표시 |
| export 구조 복잡 | index.ts부터 순차 분석 |
| 파싱 오류 | 해당 파일 스킵 → 오류 보고 |
| 대용량 파일 | `edit_file` 사용 |

## 주의사항

- **한국어 작성**: 설명은 한국어로
- **간결하게**: 자명한 내용은 생략 가능
- **코드 변경 금지**: TSDoc만 추가, 로직 수정 없음
- **기존 TSDoc 존중**: `--update` 없으면 덮어쓰지 않음

## 사용 예시

```bash
/sd:tsdoc core-common          # core-common 패키지 TSDoc 작성
/sd:tsdoc src/utils/string.ts  # 특정 파일만
/sd:tsdoc --check --all        # 전체 패키지 TSDoc 누락 검사
/sd:tsdoc core-node --update   # 기존 TSDoc 포함 재작성
```
