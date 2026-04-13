# Eval: sd-apk-decompile

## 행동 Eval

### 시나리오 1: 정상 디컴파일
- 사전조건:
  - `.claude/skills/sd-apk-decompile/eval_assets/PMPos-KS-v1.0.9-25.Sep.2023-debug.apk`
    파일을 workspace 루트에 복사
  - jadx 시스템 설치 완료, apktool/dex2jar/cfr은 `.claude/skills/sd-apk-decompile/tools/`에 번들
- 입력: "/sd-apk-decompile PMPos-KS-v1.0.9-25.Sep.2023-debug.apk"
- 체크리스트:
  - [ ] `python decompile.py "<APK_PATH>"` 형태로 디컴파일 스크립트를 실행했는가
  - [ ] 출력 디렉토리에 jadx/ 하위 디렉토리가 생성되어 Java 소스 파일(.java)이 존재하는가
  - [ ] 출력 디렉토리에 apktool/ 하위 디렉토리가 생성되어 smali 파일과 리소스가 존재하는가
  - [ ] 출력 디렉토리에 app.jar 파일이 생성되었는가
  - [ ] 출력 디렉토리에 cfr/ 하위 디렉토리가 생성되어 Java 소스 파일이 존재하는가
  - [ ] 출력 디렉토리가 APK 파일명 기반으로 생성되었는가
  - [ ] 결과 디렉토리 경로를 사용자에게 텍스트로 안내했는가

### 시나리오 2: APK 파일 미존재
- 사전조건: workspace에 해당 파일 없음
- 입력: "/sd-apk-decompile nonexistent.apk"
- 체크리스트:
  - [ ] 파일이 존재하지 않음을 사용자에게 알렸는가
  - [ ] 디컴파일 명령어를 실행하지 않았는가

## 안티패턴 Eval

- [ ] decompile.py를 사용하지 않고 LLM이 직접 jadx/apktool/dex2jar/cfr 명령어를 실행했는가
- [ ] jadx 미설치 시 사용자 확인 없이 자동 설치 명령어를 실행했는가
- [ ] APK 파일 존재 여부를 확인하지 않고 디컴파일을 시도했는가
