# Slice 1: startActivityForResult Android 수동 테스트

## 전제 조건

- Capacitor 앱이 Android 디바이스/에뮬레이터에서 실행 중이다
- `capacitor-plugin-intent`가 플러그인으로 등록되어 있다

## Scenario: action만 지정하여 Activity 시작

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.PICK" })` 호출
2. Android 시스템이 해당 action을 처리할 수 있는 앱 목록을 표시하는지 확인

### 기대 결과
- 해당 action을 처리하는 Activity가 열린다

## Scenario: action + uri 지정

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.VIEW", uri: "content://contacts/people/1" })` 호출

### 기대 결과
- Intent의 data에 해당 URI가 설정되어 Activity가 열린다

## Scenario: extras 지정

### 수행 절차
1. `Intent.startActivityForResult({ action: "com.example.ACTION", extras: { "key": "value" } })` 호출

### 기대 결과
- Intent의 extra에 해당 데이터가 포함되어 Activity가 열린다

## Scenario: package + component로 명시적 Activity 지정

### 수행 절차
1. 대상 앱의 패키지명과 Activity 클래스명을 확인
2. `Intent.startActivityForResult({ action: "android.intent.action.MAIN", package: "com.example.app", component: "com.example.app.MainActivity" })` 호출

### 기대 결과
- 지정된 패키지의 지정된 Activity가 직접 열린다

## Scenario: type(MIME type) 지정

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.GET_CONTENT", type: "image/*" })` 호출

### 기대 결과
- Intent의 MIME type이 설정되어 이미지 선택 Activity가 열린다

## Scenario: uri + type 동시 지정

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.VIEW", uri: "content://media/images", type: "image/png" })` 호출

### 기대 결과
- Intent에 setDataAndType으로 URI와 MIME type이 함께 설정된다

## Scenario: 대상 Activity가 RESULT_OK로 종료

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.GET_CONTENT", type: "image/*" })` 호출
2. 열린 Activity에서 이미지를 선택

### 기대 결과
- Promise가 resolve되고 `{ resultCode: -1, data: "content://...", extras: {...} }` 형태의 결과를 반환한다

## Scenario: 대상 Activity가 RESULT_CANCELED로 종료 (사용자 뒤로가기)

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.GET_CONTENT", type: "image/*" })` 호출
2. 열린 Activity에서 뒤로가기 버튼 누름

### 기대 결과
- Promise가 resolve되고 `{ resultCode: 0 }`을 반환한다

## Scenario: 대상 Activity가 data 없이 종료

### 수행 절차
1. data를 반환하지 않는 Activity를 시작하고 정상 완료

### 기대 결과
- 반환값의 `data` 필드는 undefined이다

## Scenario: 대상 Activity가 extras 없이 종료

### 수행 절차
1. extras를 반환하지 않는 Activity를 시작하고 정상 완료

### 기대 결과
- 반환값의 `extras` 필드는 undefined이다

## Scenario: 존재하지 않는 앱으로 Activity 시작 시도

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.MAIN", package: "com.nonexistent.app", component: "com.nonexistent.app.MainActivity" })` 호출

### 기대 결과
- ActivityNotFoundException이 발생하여 Promise가 reject된다
