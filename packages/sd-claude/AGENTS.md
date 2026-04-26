# AGENTS.md

## Package Overview

- 패키지명: `@simplysm/sd-claude`
- 설명: Claude Code 셋업 자산과 계정 전환 CLI를 배포하는 패키지.
- 공개 TypeScript 소스 파일 수: 0
- 공개 `main`/`exports` entrypoint: 없음
- CLI binary: `sd-claude` -> `scripts/cli.mjs`

이 패키지는 `src/` 기반 라이브러리가 아니다. `package.json`의 `files`에는 `scripts`와 `claude`만 포함되며, 소비자 코드에서 import할 공개 API가 확인되지 않는다.

## Architecture

```text
packages/sd-claude/
├─ package.json
├─ CLAUDE.md
├─ scripts/
│  ├─ auth.mjs
│  ├─ cli.mjs
│  ├─ postinstall.mjs
│  ├─ sd-entries.mjs
│  └─ sync.mjs
└─ claude/
   ├─ references/
   ├─ rules/
   ├─ skills/
   ├─ settings.json
   └─ sd-*
```

- `scripts/cli.mjs`: `sd-claude` binary의 진입점. `auth save`, `auth switch` 하위 명령만 라우팅한다.
- `scripts/auth.mjs`: Claude Code 인증 프로필을 `~/.claude/profiles.json`에 저장하고, 선택한 프로필의 refresh token으로 `claude auth login`을 실행한다.
- `scripts/postinstall.mjs`: 패키지 설치 후 `claude/`에 포함된 `sd-*` 자산과 `settings.json`을 소비 프로젝트의 `.claude/`로 복사한다. 실패는 경고로 처리해 설치를 차단하지 않는다.
- `scripts/sync.mjs`: 패키징 전에 루트 `.claude/`의 `sd-*` 자산과 `settings.json`을 `packages/sd-claude/claude/`로 동기화한다.
- `scripts/sd-entries.mjs`: 루트 레벨 및 1단계 하위 디렉터리에서 `sd-*` 항목을 수집하는 공통 유틸리티다.
- `claude/`: 배포 대상 Claude Code rules, skills, references, hook/helper script, settings 자산을 담는다.

## Key Patterns

### CLI 하위 명령 라우팅

`scripts/cli.mjs`는 첫 번째 인자를 command, 두 번째 인자를 action으로 해석한다. 현재 지원 command는 `auth` 하나이며, action은 `save`와 `switch`만 허용한다.

```javascript
const subcommand = process.argv[2];
const action = process.argv[3];

if (subcommand === "auth") {
  const auth = await import("./auth.mjs");
  if (action === "save") {
    await auth.save();
  } else if (action === "switch") {
    await auth.switch_();
  } else {
    printUsage();
    process.exit(1);
  }
} else {
  printUsage();
  process.exit(1);
}
```

새 CLI action을 추가할 때는 `cli.mjs`의 라우팅과 `printUsage()` 안내를 함께 갱신한다.

### `sd-*` 자산만 동기화

`scripts/sd-entries.mjs`는 기준 디렉터리의 루트 항목과 1단계 하위 디렉터리 항목 중 이름이 `sd-`로 시작하는 항목만 수집한다.

```javascript
export function forEachSdEntry(dir, callback) {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith("sd-")) {
      callback(dirent.name);
    } else if (dirent.isDirectory()) {
      const subPath = path.join(dir, dirent.name);
      for (const name of fs.readdirSync(subPath)) {
        if (name.startsWith("sd-")) {
          callback(path.join(dirent.name, name));
        }
      }
    }
  }
}
```

`settings.json`은 `sd-*` 이름 규칙에 포함되지 않으므로 `postinstall.mjs`와 `sync.mjs`에서 별도로 추가한다.

### 설치 실패 비차단

`postinstall.mjs`는 전체 설치 로직을 `try/catch`로 감싸고, 오류가 발생해도 `console.warn`만 출력한다. 이 패키지의 Claude Code 자산 설치 실패가 소비 프로젝트의 `pnpm install` 실패로 전파되지 않는 구조다.

```javascript
try {
  // install assets
} catch (err) {
  console.warn("[@simplysm/sd-claude] postinstall warning:", err.message);
}
```

### Simplysm 동일 메이저 모노레포에서는 설치 생략

`postinstall.mjs`는 소비 프로젝트의 `package.json` 이름이 `simplysm`이고, 프로젝트 메이저 버전과 `@simplysm/sd-claude` 메이저 버전이 같으면 설치를 생략한다. 이 저장소 자체에서 패키지를 설치할 때 `claude/` 자산을 루트 `.claude/`로 다시 복사하지 않기 위한 분기다.

### prepack 동기화 필터

`sync.mjs`는 루트 `.claude/`에서 `sd-*` 자산을 패키지의 `claude/`로 복사하되, `evals/` 경로와 `SKILL.eval.md`, `eval_` 접두 파일은 배포 자산에서 제외한다.

```javascript
const allEntries = collectSdEntries(claudeDir).filter(
  (rel) => !rel.replace(/\\/g, "/").startsWith("evals/"),
);
```

## Package-specific Notes

- `package.json`에 `main` 또는 `exports`가 없으므로 소비자 문서 entrypoint를 추적할 수 없다.
- 병합 소스 파일에 소스 섹션이 없으므로 공개 API Entry 수는 0이다.
- `scripts/*.mjs`는 패키지 운영 스크립트이며, `src/index.ts` 기반 공개 API로 문서화하지 않는다.
