---
name: sd-apk-decompile
description: APK 파일을 소스코드 분석이 가능한 수준으로 디컴파일하는 스킬. "APK 디컴파일", "APK 분석", "APK 소스 추출" 등을 요청할 때 사용한다.
model: haiku
---

# sd-apk-decompile: APK 디컴파일

## 프로세스

1. 사용자 요청에서 APK 파일 경로를 파악한다. 경로가 명시되지 않았으면 사용자에게 확인한다.
2. 디컴파일 스크립트를 실행한다:
   ```bash
   python "<SKILL_DIR>/decompile.py" "<APK_PATH>"
   ```
   `<SKILL_DIR>`은 이 SKILL.md 파일이 위치한 디렉토리의 절대 경로이다.
3. 실행 결과를 사용자에게 안내한다:
   - 성공 시: 출력 디렉토리 경로와 각 폴더의 용도 안내
   - 실패 시: 에러 메시지를 분석하여 해결 방법 안내
