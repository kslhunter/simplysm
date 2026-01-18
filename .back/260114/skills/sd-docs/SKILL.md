---
name: sd-docs
description: 이 스킬은 사용자가 "README.md 생성", "README.md 업데이트", "패키지 문서 생성", "프로젝트 문서 업데이트"를 요청하거나, 프로젝트/패키지 README 문서화 방법에 대한 안내가 필요할 때 사용해야 합니다.
---

# 프로젝트 문서 생성

패키지 및 루트 README.md 파일을 생성하고 업데이트하는 워크플로우 제공.

## 개요

| 문서 | 대상 독자 | 목적 | 위치 |
|------|----------|------|------|
| 루트 README.md | 개발자/기여자 | 프로젝트 소개, 패키지 목록, 시작 방법 | 프로젝트 루트 |
| 패키지 README.md | 패키지 사용자 | 설치, 사용법, API 문서 | `packages/{name}/` |

**적용 대상**: `package.json`에 `private: true`가 없는 라이브러리 패키지만 README 생성.

---

## 워크플로우

### 1단계: 대상 결정

1. **범위 확인**:
   - 루트 (README.md만)
   - 특정 패키지
   - 전체 (루트 + 모든 패키지) - 기본값

2. **미지정 시**: 전체로 처리

### 2단계: 컨텍스트 수집

1. 루트 `package.json` 읽기 (name, description)
2. 패키지 작업 시:
   - `packages/{패키지명}/package.json`
   - `packages/{패키지명}/src/index.ts` (공개 API 파악)

### 3단계: 문서 생성/업데이트

**루트 README**: `sd-docs/references/readme-root.md` 가이드 참조

**패키지 README**:
1. `package.json`의 `private` 필드 확인
2. `private: true` → 건너뜀
3. `private` 없음/`false` → `sd-docs/references/readme-package.md` 가이드 참조

### 4단계: 검증

- 문서 구조 확인
- 링크 정상 여부 확인
- 마크다운 문법 검증

---

## 빠른 참조

### 패키지 타입 판단

```
package.json의 "private" 필드:
- private: true → 프로덕션 패키지 → README 생성 안함
- private: false 또는 없음 → 라이브러리 패키지 → README 생성
```

### 정보 소스

| 문서 | 레벨 | 정보 소스 |
|------|------|----------|
| README.md | 루트 | `package.json`, 패키지 목록 |
| README.md | 패키지 | `package.json`, `src/index.ts` |

---

## 추가 리소스

### 참조 파일

- **`sd-docs/references/readme-root.md`** - 루트 README.md 구조 및 작성 가이드
- **`sd-docs/references/readme-package.md`** - 패키지 README.md 구조 및 작성 가이드
