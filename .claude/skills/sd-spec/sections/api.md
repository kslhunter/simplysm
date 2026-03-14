# API 관련 추가 섹션

요구사항에 API/엔드포인트가 포함된 경우, 기본 섹션에 아래 양식을 추가한다.

## 엔드포인트 목록

API 엔드포인트를 정의한다.

**양식:**
```markdown
## 엔드포인트 목록

| 메서드 | 경로 | 설명 | 인증 |
|-------|------|------|------|
| {GET/POST/PUT/DELETE} | {/api/...} | {설명} | {Y/N} |
```

**예시:**
```markdown
## 엔드포인트 목록

| 메서드 | 경로 | 설명 | 인증 |
|-------|------|------|------|
| GET | /api/users | 사용자 목록 조회 | Y |
| GET | /api/users/:id | 사용자 상세 조회 | Y |
| POST | /api/users | 사용자 생성 | Y (admin) |
| PUT | /api/users/:id | 사용자 수정 | Y |
| DELETE | /api/users/:id | 사용자 삭제 | Y (admin) |
```

## 요청/응답 스키마

각 엔드포인트의 요청 및 응답 형식을 정의한다.

**양식:**
````markdown
## 요청/응답 스키마

### {메서드} {경로}

**요청:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| {필드명} | {string/number/boolean/...} | {Y/N} | {설명} |

**응답:**
```json
{
  "field": "type — 설명"
}
```
````

**예시:**
````markdown
## 요청/응답 스키마

### POST /api/users

**요청:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | Y | 사용자 이름 |
| email | string | Y | 이메일 주소 |
| role | string | N | 역할 (기본값: "user") |

**응답 (201):**
```json
{
  "id": "number — 생성된 사용자 ID",
  "name": "string — 사용자 이름",
  "email": "string — 이메일 주소",
  "role": "string — 역할",
  "createdAt": "string — ISO 8601 생성일시"
}
```

**에러 응답 (400):**
```json
{
  "error": "string — 에러 메시지",
  "details": "object — 필드별 검증 에러"
}
```
````
