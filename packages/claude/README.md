# @simplysm/claude

**이 문서는 패키지 사용자를 위한 가이드입니다.**
**개발자용 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.**

---

SIMPLYSM 프로젝트를 위한 Claude Code 확장 패키지입니다.

## 설치

```bash
yarn add -D @simplysm/claude
```

## 기능

패키지 설치 시 자동으로 `.claude` 폴더에 다음 파일들이 복사됩니다:

| 경로 | 설명 |
|------|------|
| `.claude/commands/sd/*.md` | SIMPLYSM 전용 Claude Code 명령어 |
| `.claude/references/*.md` | 문서 템플릿 및 참조 자료 |
| `.claude/scripts/*.js` | statusline 등 스크립트 |
| `.claude/hooks/*.js` | Claude Code hooks |

### 포함된 명령어

| 명령어 | 설명 |
|--------|------|
| `/sd:check` | 품질 검증 (타입체크 → ESLint → 테스트) |
| `/sd:commit` | Git 커밋 메시지 자동 생성 |
| `/sd:plan` | 구현 계획서 작성 |
| `/sd:task` | Plan 파일의 Phase 순차 실행 |
| `/sd:review` | 코드 심층 리뷰 |
| `/sd:docs` | CLAUDE.md / README.md 작성 |
| `/sd:tsdoc` | TSDoc 주석 작성 |
| `/sd:command` | 커맨드 생성/개선 |

## statusline 설정

`.claude/settings.json`에서 statusline을 설정하면 Claude Code 상태 표시줄에 사용량 정보가 표시됩니다.

```json
{
  "statusLine": {
    "type": "command",
    "command": "node .claude/scripts/statusline.js"
  }
}
```

### 출력 형식

```
{모델명} ■■■□□ {컨텍스트%}% ─ 주간({리셋시간}) ■■□□□ {주간%}%
```

- **컨텍스트**: 현재 컨텍스트 윈도우 사용률 (프로그레스 바)
- **주간**: 주간 사용량 (OAuth API, 실패 시 기본 데이터 폴백)
- **리셋시간**: 주간 사용량 리셋까지 남은 시간 (예: `3d2h`)

### 요구사항

- Max 요금제 + OAuth 로그인 사용자만 주간 사용량 조회 가능
- API 키 사용자는 컨텍스트만 표시됨

## 요구사항

- Node.js 20.x 이상

## 트러블슈팅

### 주간 사용량이 `?%`로 표시됨

OAuth 토큰이 없거나 만료된 경우입니다.

- **원인**: API 키 사용 또는 OAuth 로그인 안됨
- **해결**: `claude` 명령어로 OAuth 로그인 후 재시도
- **참고**: Max 요금제 사용자만 주간 사용량 조회 가능

### postinstall 후 `.claude` 폴더에 파일이 없음

`devDependencies`에 패키지가 없거나 프로젝트 루트를 찾지 못한 경우입니다.

- **확인**: `package.json`의 `devDependencies`에 `@simplysm/claude` 존재 여부
- **해결**: `yarn add -D @simplysm/claude`로 재설치

### statusline이 5초 후 빈 출력

stdin 입력이 없거나 타임아웃된 경우입니다. Claude Code가 정상적으로 JSON을 전달하는지 확인하세요.

## 라이선스

MIT
