# 디버그: Capacitor 네이티브 빌드 시 gradlew.bat spawn EINVAL

## 출처

- **origin:** `direct`

## 에러 증상

- **에러 메시지:** `spawn EINVAL`
- **위치:** `packages/sd-cli/src/capacitor/capacitor.ts:1015` (`_buildAndroid` → `_exec(gradlew, ...)`)
- **재현:** Windows에서 `pnpm build --debug` 실행 시, Capacitor 네이티브 빌드 단계에서 발생

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: cap copy 성공 후 발생 | E2: cpx.spawn은 shell:true 미사용 | E3: pnpm exec cap 정상 동작 | E4: Windows .bat은 cmd.exe 필요 |
|----|---|---|---|---|
| H1: `.bat` + `shell:false` | C(code) | C(code) | C(code) — pnpm은 .exe | C(doc) |
| H2: POSIX 경로 문제 | C(code) | N | I → 폐기 | N |
| H3: 파일 부재/권한 | C(infer) | N | N | I → 폐기 (ENOENT이어야 함) |

### 결과: 확정 — H1

`_buildAndroid`에서 `gradlew.bat`을 `child_process.spawn`에 `shell: true` 없이 전달.
Windows에서 `.bat` 파일은 `cmd.exe`를 통해 해석되어야 하므로 `EINVAL` 발생.

- `cpx.spawn` (`core-node/src/utils/cp.ts`)은 네이티브 `child_process.spawn`을 `shell: true` 없이 호출
- `pnpm`은 `.exe` 바이너리이므로 동일 경로에서 정상 동작

## 해결 방안

### 방안 A: `_exec`에 `shell: true` 옵션 전달

- **설명:** `_exec` 메서드에서 Windows + `.bat` 감지 시 `shell: true` 추가
- **장점:** 변경 범위 최소 (1개 메서드)
- **반론:** 범용 메서드에 `.bat` 감지 로직 혼재, shell injection 이론적 위험
- **점수:** 안정성 8, 정확성 9, 일관성 7 → **평균 8.0/10**

### 방안 B: `_buildAndroid`에서 `cmd /c`로 실행

- **설명:** `_buildAndroid`에서 Windows일 때 `cmd.exe /c gradlew.bat`으로 명시적 실행
- **장점:** `_exec` 수정 불필요, 이미 Windows 분기가 있는 메서드라 자연스러움
- **반론:** 경로에 공백 있으면 인용 필요할 수 있음 (현재 무관)
- **점수:** 안정성 9, 정확성 9, 일관성 9 → **평균 9.0/10**

## 선택 결과

**방안 B** (평균 9.0/10)

`_buildAndroid`에서 Windows일 때 `cmd /c gradlew.bat`으로 실행하여 근본 원인 해결.
