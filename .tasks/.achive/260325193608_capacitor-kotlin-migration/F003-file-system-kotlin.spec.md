# F003 file-system 플러그인 Kotlin 전환 수동 테스트

## 전제 조건

- Android 디바이스 또는 에뮬레이터 (API 23 이상)
- 앱이 빌드되어 설치된 상태
- file-system 플러그인을 사용하는 화면에 접근 가능

## 수행 절차

1. 앱을 빌드한다 (Kotlin 컴파일이 성공하는지 확인)
2. 앱을 Android 디바이스/에뮬레이터에 설치한다
3. file-system 플러그인의 각 기능을 호출하여 동작을 확인한다:
   - checkPermissions: 권한 상태 반환 확인
   - requestPermissions: 권한 요청 다이얼로그 표시 확인
   - readdir: 디렉토리 목록 조회 확인
   - getStoragePath: 각 storage type별 경로 반환 확인
   - getUri: FileProvider URI 생성 확인
   - writeFile: utf8/base64 인코딩으로 파일 쓰기 확인
   - readFile: utf8/base64 인코딩으로 파일 읽기 확인
   - remove: 파일/디렉토리 삭제 확인
   - mkdir: 디렉토리 생성 확인
   - exists: 파일/디렉토리 존재 여부 확인

## 기대 결과

- Kotlin 컴파일이 성공한다
- 모든 플러그인 메서드가 Java 버전과 동일하게 동작한다
- 에러 메시지와 반환값이 Java 버전과 동일하다
