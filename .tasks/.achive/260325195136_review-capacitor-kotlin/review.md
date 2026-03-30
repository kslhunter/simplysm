# Code Review: Capacitor 플러그인 Kotlin 전환

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/capacitor-plugin-{auto-update,broadcast,file-system,usb-storage}` |
| 일시 | 2026-03-25 |
| 분석 파일 수 | 9개 (Kotlin 소스 5개 + build.gradle 4개) |
| 발견 이슈 | 2건 (Critical: 0, Medium: 2, Low: 0) |

## Medium

### DESIGN-001

```
id: DESIGN-001
severity: Medium
category: 설계
location: 4개 패키지 전체
title: Kotlin 소스 디렉토리 경로가 패키지별로 불일치
description: |
  auto-update와 usb-storage는 .kt 파일을 `src/main/java/`에 배치하고,
  broadcast와 file-system은 `src/main/kotlin/`에 배치했다.
  Gradle의 Kotlin 플러그인은 두 경로 모두에서 컴파일하므로 빌드는 성공하지만,
  패키지 간 컨벤션이 불일치하여 유지보수 시 혼란을 준다.
suggestion: |
  4개 패키지 모두 `src/main/kotlin/`으로 통일한다.
  auto-update, usb-storage의 .kt 파일을 `src/main/java/` → `src/main/kotlin/`으로 이동한다.
```

| 패키지 | 현재 경로 | 권장 경로 |
|--------|----------|----------|
| auto-update | `src/main/java/.../*.kt` | `src/main/kotlin/.../*.kt` |
| broadcast | `src/main/kotlin/.../*.kt` | (이미 올바름) |
| file-system | `src/main/kotlin/.../*.kt` | (이미 올바름) |
| usb-storage | `src/main/java/.../*.kt` | `src/main/kotlin/.../*.kt` |

### DESIGN-002

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/capacitor-plugin-usb-storage/android/src/main/java/kr/co/simplysm/capacitor/usbstorage/UsbStoragePlugin.kt:239
title: UsbFileInputStream 리소스 누수 — 예외 시 스트림이 닫히지 않음
description: |
  readFile 메서드에서 UsbFileInputStream을 생성(239줄)한 후, 읽기 루프(242줄) 중
  예외가 발생하면 inputStream.close()(245줄)에 도달하지 못한다.
  finally 블록(252줄)은 device.close()만 수행하므로 inputStream은 누수된다.
suggestion: |
  `inputStream.use { }` 블록으로 감싸서 예외 발생 시에도 스트림이 닫히도록 한다.

  변경 전:
    val inputStream = UsbFileInputStream(usbFile)
    val tmpBuf = ByteArray(fs.chunkSize)
    var count: Int
    while (inputStream.read(tmpBuf).also { count = it } != -1) {
        buffer.put(tmpBuf, 0, count)
    }
    inputStream.close()

  변경 후:
    UsbFileInputStream(usbFile).use { inputStream ->
        val tmpBuf = ByteArray(fs.chunkSize)
        var count: Int
        while (inputStream.read(tmpBuf).also { count = it } != -1) {
            buffer.put(tmpBuf, 0, count)
        }
    }
```
