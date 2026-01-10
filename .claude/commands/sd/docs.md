---
description: CLAUDE.md / README.md 작성/업데이트 (루트 및 패키지)
argument-hint: [대상] [--root] [--claude | --readme] [--force]
---

# /sd:docs - 문서화

$ARGUMENTS

## 트리거

- CLAUDE.md 또는 README.md 작성/업데이트 요청
- 새 패키지 문서화
- 문서 최신화

## 인수 파싱

| 인수 | 설명 |
|------|------|
| (생략) | 루트 + 모든 패키지 |
| `패키지명` | 해당 패키지만 (예: `core-common`) |
| `--root` | 루트만 |
| `--claude` | CLAUDE.md만 |
| `--readme` | README.md만 |
| `--force` | 확인 없이 덮어쓰기 |

## 실행 절차

### 1. 프로젝트 유형 판단

```
루트 package.json의 name === "simplysm"
  → simplysm 저장소
그 외
  → 일반 프로젝트
```

### 2. 대상 결정

| 인수 | 대상 |
|------|------|
| (생략) | 루트 + `packages/` 하위 모든 활성 패키지 |
| `--root` | 루트만 |
| 패키지명 | 해당 패키지만 |

> **병렬 처리**: 패키지가 5개 이상이면 `doc-writer` 에이전트(Task tool)로 패키지별 병렬 문서화

### 3. reference 파일 Read

프로젝트 유형과 대상에 따라 해당 reference 파일을 Read:

| 조건 | reference 파일 |
|------|---------------|
| simplysm + 루트 | [docs-simplysm-root.md](../../references/docs-simplysm-root.md) |
| simplysm + 패키지 | [docs-simplysm-package.md](../../references/docs-simplysm-package.md) |
| 프로젝트 + 루트 | [docs-project-root.md](../../references/docs-project-root.md) |
| 프로젝트 + 패키지 | [docs-project-package.md](../../references/docs-project-package.md) |

### 4. reference 지침대로 실행

Read한 reference 파일의 지침에 따라:
- 분석 절차 수행
- 섹션 구조에 맞게 문서 작성
- 체크리스트로 검증

### 5. 파일 저장

| 옵션 | 동작 |
|------|------|
| `--force` | 즉시 저장 |
| 기본 | 내용 표시 → 승인 후 저장 |

## 예외 처리

| 상황 | 대응 |
|------|------|
| 패키지 없음 | 사용 가능한 패키지 목록 표시 |
| 파일 쓰기 실패 | 오류 원인 안내 |
| GitHub 참조 실패 | 로컬 기준으로 작성, 경고 표시 |

## 사용 예시

```bash
/sd:docs                      # 루트 + 모든 패키지 문서화
/sd:docs --root               # 루트만
/sd:docs --root --claude      # 루트 CLAUDE.md만
/sd:docs core-common          # 패키지 문서화
/sd:docs core-common --readme # 패키지 README.md만 (simplysm만 해당)
/sd:docs --force              # 전체 강제 업데이트
```
