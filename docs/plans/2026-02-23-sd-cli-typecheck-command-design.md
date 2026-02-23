# sd-cli `typecheck` 명령 추가 설계

## 배경

기존 `check --type typecheck` 명령을 간편하게 사용하기 위해 `typecheck` 단축 명령을 추가한다.

## 변경 파일

- `packages/sd-cli/src/sd-cli-entry.ts` (1개 파일, ~15줄 추가)

## 구현

기존 `check` 명령 정의 아래에 `typecheck` 명령을 추가:

```typescript
.command(
  "typecheck [path]",
  "타입체크만 수행",
  (cmd) =>
    cmd
      .positional("path", { type: "string", describe: "체크할 경로" })
      .options({
        config: { type: "string", default: "simplysm.js", describe: "설정파일 경로" },
      }),
  async (argv) => {
    await SdCliProject.checkAsync({
      config: argv.config!,
      path: argv.path,
      type: "typecheck",
    });
  },
)
```

## 사용법

```bash
# 전체 프로젝트 typecheck
yarn run _sd-cli_ typecheck

# 특정 패키지만 typecheck
yarn run _sd-cli_ typecheck packages/sd-core-common
```

## 설계 원칙

- 기존 `SdCliProject.checkAsync()` 로직 재사용
- `type: "typecheck"` 내부 고정으로 `--type` 옵션 불필요
- `check` 명령과 동일한 `--config` 옵션 지원
- 코드 변경 최소화
