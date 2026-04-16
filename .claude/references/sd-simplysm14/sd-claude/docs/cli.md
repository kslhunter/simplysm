# CLI Commands

`sd-claude`는 `package.json`의 `bin`에 등록된 CLI 도구다. 엔트리포인트는 `scripts/cli.mjs`이다.

## `sd-claude auth save`

현재 Claude Code 계정의 Organization 이름과 refresh token을 `~/.claude/profiles.json`에 저장한다.

내부 동작:
1. `claude auth status` 명령으로 Organization 이름을 가져온다
2. `~/.claude/.credentials.json`에서 `claudeAiOauth.refreshToken`을 읽는다
3. `~/.claude/statusline-cache.json`에서 현재 사용량 정보를 읽는다
4. `~/.claude/profiles.json`에 계정 정보를 저장하고 `current`를 해당 계정으로 설정한다

에러 조건:
- Organization 이름을 가져올 수 없으면 에러 종료
- refresh token이 비어 있으면 에러 종료

## `sd-claude auth switch`

저장된 계정 목록을 표시하고, 사용자가 선택한 계정으로 전환한다. TTY가 필요하다.

내부 동작:
1. `~/.claude/profiles.json`에서 저장된 계정 목록을 로드한다
2. 계정 목록을 사용량 정보와 함께 표시한다 (현재 계정은 `*`로 표시)
3. 사용자가 번호를 입력하면 해당 계정으로 전환한다
4. 전환 전 현재 계정의 refresh token과 사용량을 백업한다
5. `claude auth login`을 `CLAUDE_CODE_OAUTH_REFRESH_TOKEN` 환경변수와 함께 실행한다
6. 전환 후 갱신된 refresh token을 저장하고 `current`를 업데이트한다

에러 조건:
- TTY가 아니면 에러 종료
- 저장된 계정이 없으면 안내 메시지 출력 후 종료

## 프로필 파일 구조

`~/.claude/profiles.json`:

```json
{
  "current": "OrgName",
  "accounts": {
    "OrgName": {
      "refreshToken": "...",
      "usage": {
        "fiveHour": { "usedPercentage": 42, "resetsAt": 1712345678 },
        "sevenDay": { "usedPercentage": 15, "resetsAt": 1712900000 }
      }
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `current` | `string` | 현재 활성 계정의 Organization 이름 |
| `accounts` | `Record<string, AccountInfo>` | Organization 이름을 키로 하는 계정 정보 맵 |

### AccountInfo

| Field | Type | Description |
|-------|------|-------------|
| `refreshToken` | `string` | OAuth refresh token |
| `usage` | `UsageInfo \| null` | 마지막 저장/전환 시점의 사용량 정보 |

### UsageInfo

| Field | Type | Description |
|-------|------|-------------|
| `fiveHour.usedPercentage` | `number \| null` | 5시간 사용량 퍼센트 |
| `fiveHour.resetsAt` | `number \| null` | 5시간 리셋 시간 (Unix epoch seconds) |
| `sevenDay.usedPercentage` | `number \| null` | 7일 사용량 퍼센트 |
| `sevenDay.resetsAt` | `number \| null` | 7일 리셋 시간 (Unix epoch seconds) |

## 사용량 표시 형식

계정 목록에서 사용량은 `[5h%(남은시간), 7d%(남은시간)]` 형식으로 표시된다.

- 현재 계정: `statusline-cache.json`에서 실시간 데이터 사용 (라이브)
- 다른 계정: 마지막 저장/전환 시점의 데이터 사용 (← 저장 시점 표시)
- 사용량 정보 없음: `[사용량 정보 없음]` 표시

남은 시간 형식: `Xd Yh` (일+시간), `Xh Ym` (시간+분), `Xm` (분), `0m` (만료)
