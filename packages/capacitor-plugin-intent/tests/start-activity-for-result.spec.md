# startActivityForResult Android 수동 테스트

## 전제 조건
- Capacitor 앱이 Android 기기 또는 에뮬레이터에 설치되어 있다
- capacitor-plugin-intent가 앱에 등록되어 있다
- 테스트용 Activity를 가진 앱(예: 결제 앱, 파일 선택기)이 설치되어 있다

## 테스트 1: action만 지정하여 Activity를 시작한다

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.PICK", type: "image/*" })`를 호출한다
2. 이미지 선택기가 열리는지 확인한다
3. 이미지를 선택한다

### 기대 결과
- `resultCode`가 `-1` (RESULT_OK)이다
- `data.uri`에 선택한 이미지의 content URI가 포함되어 있다

## 테스트 2: action과 extras를 함께 지정한다

### 수행 절차
1. `Intent.startActivityForResult({ action: "com.example.PAY", extras: { amount: 1000, currency: "KRW" } })`를 호출한다
2. 대상 Activity에서 extras 값이 올바르게 전달되었는지 확인한다

### 기대 결과
- 대상 Activity가 extras를 정상적으로 수신한다
- 결과에 `resultCode`와 `data`가 반환된다

## 테스트 3: packageName과 className을 함께 지정한다

### 수행 절차
1. `Intent.startActivityForResult({ packageName: "com.example.app", className: "com.example.app.MainActivity" })`를 호출한다

### 기대 결과
- 지정된 앱의 특정 Activity가 열린다
- 결과가 정상적으로 수신된다

## 테스트 4: 사용자가 Activity를 취소한다

### 수행 절차
1. `Intent.startActivityForResult({ action: "android.intent.action.PICK", type: "image/*" })`를 호출한다
2. 뒤로가기 버튼을 눌러 취소한다

### 기대 결과
- `resultCode`가 `0` (RESULT_CANCELED)이다
- `data`는 undefined이다

## 테스트 5: 존재하지 않는 앱을 지정한다

### 수행 절차
1. `Intent.startActivityForResult({ packageName: "com.nonexistent.app" })`를 호출한다

### 기대 결과
- Promise가 에러 메시지와 함께 reject된다
