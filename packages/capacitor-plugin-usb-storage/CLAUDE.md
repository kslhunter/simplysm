# CLAUDE.md — `@simplysm/capacitor-plugin-usb-storage`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

Android USB OTG **저장소(외장 드라이브) 마운트·파일 액세스** Capacitor 플러그인. 빌드 타겟 `browser`.

## 구조

| 경로                          | 내용                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `src/UsbStorage.ts`           | 사용자 facade — 장치 목록, 마운트, 디렉토리/파일 IO.                                |
| `src/UsbStoragePlugin.ts`     | Capacitor 인터페이스.                                                               |
| `src/web/`                    | Web fallback(`navigator.usb` / FileSystem Access API 가능 범위 내).                  |
| `android/`                    | UsbManager + Storage Access Framework / 외장 저장소 권한 처리.                      |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/core-browser`. peerDep: `@capacitor/core`.

## 작업 시 주의

- USB 권한은 인텐트 필터 + `UsbDevice` 별 요청. 디바이스 hot-plug 이벤트 구독을 깨뜨리지 마라.
- 파일 IO 는 항상 스트림 우선(대용량 USB 미디어). 한꺼번에 읽기 금지.
- Android 버전별 SAF API 차이가 크다 — 최소 지원 SDK 변경 시 회귀 검증.
- iOS 미지원(외장 저장소 접근 자체가 제한적).
