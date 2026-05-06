# CLAUDE.md — `@simplysm/capacitor-plugin-file-system`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

Capacitor 앱의 **네이티브 파일시스템 접근**(Capacitor 기본 plugin 보다 폭넓은 권한·zip·대용량 처리). 빌드 타겟 `browser`.

## 구조

| 경로                          | 내용                                                                |
| ----------------------------- | ------------------------------------------------------------------- |
| `src/FileSystem.ts`           | 사용자 facade.                                                      |
| `src/FileSystemPlugin.ts`     | Capacitor `registerPlugin` 인터페이스(메서드 시그니처).             |
| `src/web/`                    | Web fallback — 가능한 범위에서 `IndexedDbVirtualFs`(core-browser) 등으로 재구현. |
| `android/`                    | Android 네이티브 구현.                                              |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/core-browser`. peerDep: `@capacitor/core`.

## 작업 시 주의

- TS API ↔ Android 네이티브 메서드 시그니처 동기화 필수.
- 권한(Storage, MANAGE_EXTERNAL_STORAGE 등) 요청 흐름은 호출 측에서 의식하지 않게 facade 가 처리. 새 API 추가 시 권한 요청을 빠뜨리지 마라.
- iOS 미포함. web fallback 으로 동작은 가능하나 디스크 영속성은 IndexedDB.
- 다른 Capacitor 플러그인(`capacitor-plugin-auto-update`)이 이 패키지를 의존하므로 API 변경은 깨질 호출처를 함께 갱신.
