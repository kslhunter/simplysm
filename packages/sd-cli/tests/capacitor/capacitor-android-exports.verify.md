# Capacitor Android 설정 분리 — LLM 검증

## 검증 항목

- configureAndroid이 capacitor-android.ts에서 export된다: line 13 `export async function configureAndroid`
- findJava21이 capacitor-android.ts에서 export된다: line 53 `export async function findJava21`
- findAndroidSdk가 capacitor-android.ts에서 export된다: line 76 `export async function findAndroidSdk`
- 내부 configure 함수들(_configureJavaHomePath 등)은 export되지 않는다: `^export` 검색 결과 3개만 확인
- Capacitor 클래스의 _validateTools가 findAndroidSdk/findJava21을 import하여 사용한다: line 8 import, line 217/229 호출
- Capacitor 클래스에서 9개 Android 설정 private 메서드가 삭제되었다: `_configureAndroid` 등 검색 결과 0건
- capacitor.ts에서 env import가 제거되었다: `import.*env.*from` 검색 결과 0건
