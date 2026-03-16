---
name: sd-apk-decompile
description: APK 파일을 디컴파일하여 Java 소스, 리소스, 웹 에셋을 추출. 사용자가 APK 분석이나 디컴파일을 요청할 때 사용
argument-hint: "<APK 파일 경로> [--quick]"
---

# sd-apk-decompile: APK 디컴파일

Android APK 파일을 디컴파일하여 Java 소스, 리소스, 웹 에셋, 네이티브 라이브러리 정보를 추출한다.

- **기본 모드**: JADX + Apktool + dex2jar/CFR 전체 파이프라인 (Phase 2, 3은 병렬 실행)
- **--quick 모드**: JADX만 사용 (Phase 2, 4 스킵)
- Phase 5(웹 에셋), Phase 6(네이티브)은 두 모드 모두에서 해당 시 실행한다

**에러 처리 원칙:** 개별 Phase가 실패해도 에러를 기록하고 다음 Phase를 계속 진행한다. 최종 요약에서 실패한 Phase를 보고한다.

## 1. 인자 파싱

`$ARGUMENTS`에서 APK 파일 경로와 옵션을 파싱한다.

- 첫 번째 인자: APK 파일 경로 (필수)
- `--quick`: JADX만 사용하는 빠른 모드 (선택)
- `$ARGUMENTS`가 비어있으면 AskUserQuestion으로 APK 파일 경로를 요청한다

파싱 후 Bash로 파일을 검증한다:

```bash
test -f "<apk_path>"
```

- 파일이 없으면 "파일을 찾을 수 없습니다: {경로}"를 출력하고 종료한다
- `.apk` 확장자가 아니면 "APK 파일이 아닙니다: {경로}"를 출력하고 종료한다

출력 디렉토리를 결정한다:
- APK 파일과 동일 디렉토리에 `<APK파일명(확장자 제외)>_decompiled/`
- 이미 존재하면 덮어쓴다 (기존 결과를 갱신)

## 2. 도구 의존성 검사

Bash로 모든 도구의 설치 여부를 **병렬로** 확인한다.

**필수 도구 (항상 검사):**

```bash
java -version 2>&1
jadx --version 2>&1
```

**추가 도구 (--quick이 아닐 때만 검사):**

```bash
apktool --version 2>&1
d2j-dex2jar.bat --help 2>&1 || d2j-dex2jar.sh --help 2>&1
```

CFR 검사 — JAR 파일이므로 다음 순서로 탐색:
1. 환경변수 `CFR_JAR`가 설정되어 있으면 `test -f "$CFR_JAR"` 확인
2. 없으면 미설치로 판단

**미설치 도구가 있으면** 다음 테이블을 출력하고 **스킬 실행을 중단**한다:

```
## 미설치 도구

| 도구 | 설치 방법 |
|------|----------|
| Java | Android SDK에 포함. JAVA_HOME 환경변수 확인 |
| JADX | choco install jadx 또는 https://github.com/skylot/jadx/releases |
| Apktool | https://apktool.org/docs/install/ |
| dex2jar | https://github.com/pxb1988/dex2jar/releases |
| CFR | https://github.com/leibnitz27/cfr/releases → CFR_JAR 환경변수에 경로 설정 |

도구 설치 후 다시 실행하세요.
```

## 3. Phase 1: 기본 정보 추출

출력 디렉토리를 생성하고, APK 내부 구조를 파악한다.

```bash
mkdir -p "<output>"
unzip -l "<apk_path>" | grep -E "(classes.*\.dex|\.so|assets/public/|assets/www/)"
```

`unzip -l`이 실패하면 "APK 파일을 읽을 수 없습니다 (파일이 손상되었을 수 있음)"를 출력하고 종료한다.

grep 출력에서 다음을 확인한다:
- `classes*.dex` 파일 수 카운트 → **dex_count**
- `lib/` 하위에 `.so` 파일 존재 여부 → **has_native_libs** 플래그
- `assets/public/` 존재 여부 → **is_capacitor** 플래그
- `assets/www/` 존재 여부 → **is_cordova** 플래그

**dex_count가 0이면**: "DEX 파일이 없습니다. 리소스만 추출합니다." 경고를 출력하고, Phase 3(JADX)과 Phase 4(dex2jar+CFR)를 스킵한다.

확인 결과를 텍스트로 출력한다:

```
## APK 구조 분석

- DEX 파일: N개
- 네이티브 라이브러리: 있음/없음
- Capacitor 앱: Yes/No
- Cordova 앱: Yes/No
```

## 4. Phase 2+3: 리소스 디코딩 + Java 소스 복원

### Phase 2: Apktool (--quick 시 스킵)

**`--quick` 모드이면 Phase 2를 건너뛴다.**

**비-quick 모드에서 Phase 2(Apktool)와 Phase 3(JADX)은 독립 작업이므로 병렬로 실행한다** (각각 별도 Bash 호출).

Apktool로 리소스를 디코딩하고 smali를 추출한다:

```bash
apktool d "<apk_path>" -o "<output>/apktool" -f
```

완료 후 필요한 파일을 정리한다:

```bash
cp "<output>/apktool/AndroidManifest.xml" "<output>/AndroidManifest.xml"
cp -r "<output>/apktool/res" "<output>/res"
mkdir -p "<output>/smali"
cp -r "<output>"/apktool/smali*/* "<output>/smali/" 2>/dev/null
```

### Phase 3: JADX

핵심 단계. JADX로 DEX를 Java 소스로 디컴파일한다. 대형 APK는 시간이 오래 걸릴 수 있으므로 **Bash timeout을 600초(10분)로 설정**한다:

```bash
jadx -d "<output>/src" --deobf --show-bad-code "<apk_path>"
```

- `--deobf`: 난독화된 클래스/메서드명을 가독성 있는 이름으로 변환
- `--show-bad-code`: 디컴파일 실패한 코드도 주석 형태로 포함

JADX의 stderr 출력에서 디컴파일 통계를 파싱한다 (예: `INFO  - Finished, ... classes, ... error`):
- 처리된 클래스 수
- 에러 발생 클래스 수

**`--quick` 모드에서만** (Apktool이 AndroidManifest.xml을 생성하지 않았을 때) JADX 리소스에서 복사한다:

```bash
cp "<output>/src/resources/AndroidManifest.xml" "<output>/AndroidManifest.xml" 2>/dev/null
```

## 5. Phase 4: 교차 검증 (dex2jar + CFR)

**`--quick` 모드이면 이 단계를 건너뛴다.**

JADX와 다른 알고리즘으로 디컴파일하여 보완한다.

임시 디렉토리를 만들고 DEX를 추출한다:

```bash
_WORKDIR=$(mktemp -d)
unzip -o "<apk_path>" "classes*.dex" -d "$_WORKDIR"
```

각 DEX 파일을 JAR로 변환하고 CFR로 디컴파일한다:

```bash
for dex in "$_WORKDIR"/classes*.dex; do
  jar_name="${dex%.dex}.jar"
  d2j-dex2jar.bat "$dex" -o "$jar_name" --force 2>&1 || d2j-dex2jar.sh "$dex" -o "$jar_name" --force 2>&1
done

for jar in "$_WORKDIR"/classes*.jar; do
  java -jar "$CFR_JAR" "$jar" --outputdir "<output>/src-cfr" 2>&1
done

rm -rf "$_WORKDIR"
```

## 6. Phase 5: 웹 에셋 추출

Phase 1에서 **is_capacitor** 또는 **is_cordova** 플래그가 설정된 경우에만 실행한다.
둘 다 아니면 이 단계를 건너뛴다.

Capacitor 앱인 경우:
```bash
unzip -o "<apk_path>" "assets/public/*" -d "<output>/web"
mv "<output>/web/assets/public/"* "<output>/web/" 2>/dev/null
rm -rf "<output>/web/assets"
```

Cordova 앱인 경우:
```bash
unzip -o "<apk_path>" "assets/www/*" -d "<output>/web"
mv "<output>/web/assets/www/"* "<output>/web/" 2>/dev/null
rm -rf "<output>/web/assets"
```

## 7. Phase 6: 네이티브 라이브러리 분석

Phase 1에서 **has_native_libs** 플래그가 설정된 경우에만 실행한다.
플래그가 없으면 이 단계를 건너뛴다.

APK에서 네이티브 라이브러리를 추출한다:

```bash
unzip -o "<apk_path>" "lib/*" -d "<output>"
```

각 `.so` 파일의 심볼을 추출한다 (`nm`이 없으면 이 단계를 건너뛴다):

```bash
find "<output>/lib" -name "*.so" -exec sh -c '
  nm -D "$1" > "$1.symbols.txt" 2>&1
  grep "Java_" "$1.symbols.txt" > "$1.jni.txt" 2>/dev/null
' _ {} \;
```

- `*.symbols.txt`: 전체 exported 심볼
- `*.jni.txt`: JNI 메서드만 필터링 (`Java_` 접두사)

## 8. 결과 요약 출력

`<output>/AndroidManifest.xml`이 존재하면 Read하여 앱 정보를 파싱한다. 없으면 "AndroidManifest.xml을 추출하지 못했습니다"를 출력하고 가능한 정보만으로 요약한다.

파싱할 항목:
- `package` 속성 → 패키지명
- `android:versionName` → 버전
- `uses-sdk android:targetSdkVersion` → 타겟 SDK
- `uses-permission android:name` → 퍼미션 목록
- `activity android:name` → Activity 목록
- `service android:name` → Service 목록
- `receiver android:name` → BroadcastReceiver 목록
- `provider android:name` → ContentProvider 목록

`src/` 하위 디렉토리 구조에서 사용된 라이브러리/SDK를 추정한다 (예: `com.google.firebase`, `androidx`, `org.apache` 등).

다음 형식으로 콘솔에 출력한다:

```
## 디컴파일 결과

### 앱 정보
- 패키지명: {package}
- 버전: {versionName}
- 타겟 SDK: {targetSdkVersion}

### 퍼미션
- {permission 1}
- {permission 2}
- ...

### 컴포넌트
- Activity: N개
- Service: N개
- BroadcastReceiver: N개
- ContentProvider: N개

### 앱 유형
- Capacitor: Yes/No
- Cordova: Yes/No

### 사용된 라이브러리 (추정)
- {library 1}
- {library 2}

### 네이티브 라이브러리
- {abi}/{name}.so (JNI 메서드: N개)

### 디컴파일 통계
- JADX: {처리 클래스}개 처리, {에러 클래스}개 에러
- CFR: 실행됨/스킵됨

### 실패한 Phase (있는 경우)
- Phase N: {에러 메시지}

### 출력 디렉토리
{output 절대 경로}
```

동일 내용을 `<output>/info.txt`에 Write한다.
