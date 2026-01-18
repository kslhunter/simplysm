# 루트 README.md 가이드

프로젝트 루트의 README.md 파일 구조와 작성 방법.

## 파일 위치

```
project-root/
├── README.md          ← 이 파일
├── package.json
└── packages/
```

## 문서 구조

```markdown
# 프로젝트명

[프로젝트 설명 - package.json의 description]

## 패키지

| 패키지 | 설명 |
|--------|------|
| [@scope/package-a](packages/package-a/README.md) | 패키지 A 설명 |
| [@scope/package-b](packages/package-b/README.md) | 패키지 B 설명 |

## 시작하기

### 설치

\`\`\`bash
yarn install
\`\`\`

### 개발

\`\`\`bash
yarn dev
\`\`\`

## 기술 스택

- Node.js
- TypeScript
- [기타 주요 기술]

## 라이선스

[라이선스 정보]
```

## 섹션별 작성

### 제목과 설명

- 프로젝트명: `package.json`의 `name` 필드 참고
- 설명: `package.json`의 `description` 필드 참고

### 패키지 목록

| 단계 | 작업 |
|------|------|
| 1 | `packages/` 디렉토리 스캔 |
| 2 | 각 패키지의 `package.json`에서 `name`, `description` 추출 |
| 3 | README.md 존재 시 링크 연결, 없으면 패키지명만 표시 |

**예시**:
```markdown
| 패키지 | 설명 |
|--------|------|
| [@simplysm/core](packages/core/README.md) | 핵심 유틸리티 라이브러리 |
| [@simplysm/cli](packages/cli/README.md) | CLI 도구 |
| @simplysm/internal | 내부 전용 (README 없음) |
```

**private 패키지**: 목록에 포함하되 개별 README는 생성하지 않음.

### 시작하기

- `package.json`의 `scripts` 참고
- 설치 및 개발 명령어 안내

### 기술 스택

- 주요 기술만 나열
- `package.json`의 주요 의존성 참고

### 라이선스

- `package.json`의 `license` 필드 참고
- LICENSE 파일이 있으면 링크

## 검증 항목

| 항목 | 확인 내용 |
|------|----------|
| 프로젝트명 | package.json name과 일치 여부 |
| 설명 | package.json description과 일치 여부 |
| 패키지 목록 | 모든 패키지 포함 여부 |
| README 링크 | 링크 동작 여부 |
| 시작하기 | 명령어 동작 여부 |
| 기술 스택 | 최신 상태 여부 |
| 라이선스 | 정보 정확성 |
