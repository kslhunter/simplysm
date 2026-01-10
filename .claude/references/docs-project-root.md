# 프로젝트 루트 문서 작성 가이드

`/sd:docs --root` 실행 시 (일반 프로젝트) 참조하는 가이드입니다.

---

## 1. 작성 목적

| 문서 | 목적 | 대상 독자 |
|------|------|-----------|
| **CLAUDE.md** | Claude Code 개발 시 필요한 규칙 (SIMPLYSM 참조) | Claude Code |
| **README.md** | 프로젝트 소개 및 시작 가이드 | 개발자 |

---

## 2. 사전 확인

### npm 패키지 확인

1. `node_modules/@simplysm/claude` 존재 확인
2. 없으면 설치 안내:
   ```bash
   yarn add -D @simplysm/claude
   ```
3. 설치 후 재실행

### 패키지 규칙 참조

- **참조 경로**: `node_modules/@simplysm/claude/dist/claude-docs/CLAUDE.md`
- 이 파일에서 코드 스타일, TypeScript, Angular, 모노레포 규칙 확인
- 프로젝트 CLAUDE.md에서 GitHub 링크로 참조

---

## 3. CLAUDE.md 작성

### 동작

1. npm 패키지 존재 확인 → 없으면 설치 안내
2. 기존 CLAUDE.md 확인
3. 없으면 신규 작성, 있으면 검토/업데이트
4. 프로젝트 고유 정보 추가

### 섹션 구조

| 섹션 | 필수 | 내용 |
|------|:----:|------|
| 필수 규칙 (CRITICAL) | ✅ | 언어, bash, SIMPLYSM 규칙 참조 링크 |
| 프로젝트 개요 | ✅ | 프로젝트 설명, 기술 스택 |
| 패키지 구조 | ✅ | 패키지 목록 및 유형 |
| 프로젝트 고유 규칙 | 선택 | 프로젝트별 특수 규칙 |
| 검증 방법 | ✅ | /sd:check 안내 |

### SIMPLYSM 규칙 참조

CLAUDE.md에 다음 형식으로 참조 링크 포함:

```markdown
## 필수 규칙 (CRITICAL)

| 규칙 | 설명 |
|------|------|
| **언어** | 모든 응답은 한국어로 작성 |
| **bash명령** | 윈도우의 git bash 환경임 |
| **파일 경로** | Windows Edit 툴: 백슬래시(`\`), bash: 슬래시 가능 |
| **Windows bash** | `2>nul` 사용 금지 (nul 파일 생성됨) |
| **SIMPLYSM 규칙** | 아래 링크의 코드 스타일, 모노레포 규칙 준수 |

> **SIMPLYSM 프레임워크 규칙**: https://github.com/kslhunter/simplysm/{버전}/CLAUDE.md
```

### 작성 가이드

- **규칙 위임**: 상세 규칙은 SIMPLYSM GitHub 참조
- **프로젝트 특화**: 고유 규칙만 직접 작성
- **버전 명시**: SIMPLYSM 버전을 링크에 포함
- **패키지 유형**: client/server 구분 명시

### 체크리스트

- [ ] SIMPLYSM 규칙 참조 링크 포함
- [ ] 버전이 package.json의 @simplysm/* 버전과 일치
- [ ] 패키지 목록이 실제와 일치
- [ ] 기술 스택 버전이 정확함

---

## 4. README.md 작성

### 동작

1. 기존 README.md 확인
2. 없으면 신규 작성, 있으면 검토/개선
3. 프로젝트 시작 가이드 중심

### 섹션 구조

| 섹션 | 필수 | 내용 |
|------|:----:|------|
| 프로젝트명 | ✅ | 제목 및 설명 |
| 기술 스택 | ✅ | SIMPLYSM, Angular, Node.js, DB 버전 |
| 시작하기 | ✅ | 요구사항, 설치, 개발 서버 |
| 빌드 | ✅ | 빌드 명령어 |
| 패키지 구조 | ✅ | 패키지 목록 표 |
| 배포 | 선택 | 배포 방법 |
| 라이선스 | ✅ | 라이선스 정보 |

### 작성 가이드

- **빠른 시작**: 복사-붙여넣기로 바로 실행 가능하게
- **명령어 정확**: yarn install, yarn dev, yarn build
- **요구사항 명시**: Node.js, Yarn, DB 버전

### 체크리스트

- [ ] 설치 명령어가 정확함
- [ ] 개발 서버 실행 방법 포함
- [ ] 빌드 명령어 포함
- [ ] 요구사항(Node.js, DB 등) 명시
- [ ] 패키지 목록이 실제와 일치
