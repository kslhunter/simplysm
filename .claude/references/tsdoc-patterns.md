# TSDoc 작성 패턴

`/sd:tsdoc` 커맨드에서 고급 패턴이 필요할 때 참조합니다.

---

## 기본 패턴

### 함수

```typescript
/**
 * 문자열을 지정된 구분자로 분리하여 배열로 반환
 *
 * @param input - 분리할 원본 문자열
 * @param delimiter - 구분자 (기본값: ',')
 * @returns 분리된 문자열 배열
 * @throws 입력이 null/undefined일 경우
 *
 * @example
 * ```typescript
 * split("a,b,c"); // ["a", "b", "c"]
 * split("a|b|c", "|"); // ["a", "b", "c"]
 * ```
 */
export function split(input: string, delimiter = ","): string[] {
  // ...
}
```

### 클래스

```typescript
/**
 * HTTP 요청을 처리하는 클라이언트
 *
 * 연결 풀링과 자동 재시도를 지원합니다.
 *
 * @example
 * ```typescript
 * const client = new HttpClient({ timeout: 5000 });
 * const response = await client.get("/api/users");
 * ```
 */
export class HttpClient {
  /**
   * 새 HttpClient 인스턴스 생성
   *
   * @param options - 클라이언트 설정
   */
  constructor(options: HttpClientOptions) {
    // ...
  }

  /**
   * GET 요청 수행
   *
   * @param url - 요청 URL
   * @param config - 요청별 설정 (선택)
   * @returns 응답 데이터
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    // ...
  }
}
```

### 인터페이스

```typescript
/**
 * HTTP 클라이언트 설정 옵션
 */
export interface HttpClientOptions {
  /** 요청 타임아웃 (ms) */
  timeout?: number;

  /** 기본 URL */
  baseUrl?: string;

  /** 재시도 횟수 */
  retryCount?: number;
}
```

### 타입 별칭

```typescript
/**
 * HTTP 메서드 타입
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * 비동기 함수의 반환 타입 추출
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;
```

---

## 고급 패턴

### 제네릭 함수

```typescript
/**
 * 배열에서 조건에 맞는 첫 번째 요소 반환
 *
 * @typeParam T - 배열 요소 타입
 * @param items - 검색할 배열
 * @param predicate - 검색 조건 함수
 * @returns 조건에 맞는 첫 번째 요소, 없으면 undefined
 *
 * @example
 * ```typescript
 * const users = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
 * findFirst(users, u => u.id === 2); // { id: 2, name: "B" }
 * ```
 */
export function findFirst<T>(
  items: T[],
  predicate: (item: T) => boolean
): T | undefined {
  // ...
}
```

### 제네릭 클래스

```typescript
/**
 * 키-값 쌍을 자동으로 만료시키는 캐시
 *
 * @typeParam K - 키 타입
 * @typeParam V - 값 타입
 *
 * @example
 * ```typescript
 * const cache = new ExpiringCache<string, User>(60000); // 1분 만료
 * cache.set("user:1", userData);
 * const user = cache.get("user:1");
 * ```
 */
export class ExpiringCache<K, V> {
  /**
   * @param ttlMs - 캐시 항목 유효 시간 (ms)
   */
  constructor(ttlMs: number) {
    // ...
  }
}
```

### 오버로드 함수

```typescript
/**
 * 값을 JSON 문자열로 변환
 *
 * @param value - 변환할 값
 * @returns JSON 문자열
 */
export function stringify(value: unknown): string;

/**
 * 값을 JSON 문자열로 변환 (포맷팅 옵션 포함)
 *
 * @param value - 변환할 값
 * @param options - 포맷팅 옵션
 * @returns JSON 문자열
 */
export function stringify(value: unknown, options: StringifyOptions): string;

/**
 * 값을 JSON 문자열로 변환
 *
 * @param value - 변환할 값
 * @param options - 포맷팅 옵션 (선택)
 * @returns JSON 문자열
 *
 * @example
 * ```typescript
 * stringify({ a: 1 }); // '{"a":1}'
 * stringify({ a: 1 }, { pretty: true }); // '{\n  "a": 1\n}'
 * ```
 */
export function stringify(value: unknown, options?: StringifyOptions): string {
  // ...
}
```

### 콜백 파라미터

```typescript
/**
 * 배열의 각 요소에 비동기 함수를 순차 실행
 *
 * @param items - 처리할 배열
 * @param callback - 각 요소에 실행할 비동기 함수
 *   - `item`: 현재 요소
 *   - `index`: 현재 인덱스
 *   - 반환값: Promise (완료 시점 결정)
 * @returns 모든 처리 완료 후 resolve
 *
 * @example
 * ```typescript
 * await forEachAsync(users, async (user, i) => {
 *   await saveUser(user);
 *   console.log(`Saved ${i + 1}/${users.length}`);
 * });
 * ```
 */
export async function forEachAsync<T>(
  items: T[],
  callback: (item: T, index: number) => Promise<void>
): Promise<void> {
  // ...
}
```

---

## 특수 태그

### @see 참조

```typescript
/**
 * 문자열을 Date로 파싱
 *
 * @see {@link DateTime} 더 많은 기능이 필요하면 DateTime 클래스 사용
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date | MDN Date 문서}
 */
export function parseDate(input: string): Date {
  // ...
}
```

### @deprecated

```typescript
/**
 * 문자열을 숫자로 변환
 *
 * @deprecated `Number.parseInt()` 사용 권장
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt | parseInt 문서}
 */
export function toNumber(input: string): number {
  // ...
}
```

### @internal (내부용)

```typescript
/**
 * 내부 유틸리티 함수 - 외부 사용 금지
 *
 * @internal
 */
export function _internalHelper(): void {
  // ...
}
```

### @remarks (상세 설명)

```typescript
/**
 * DB 연결 풀 관리자
 *
 * @remarks
 * 이 클래스는 싱글톤으로 사용해야 합니다.
 * 여러 인스턴스 생성 시 연결 누수가 발생할 수 있습니다.
 *
 * 연결 풀 크기는 환경 변수 `DB_POOL_SIZE`로 설정하거나
 * 생성자 옵션으로 지정할 수 있습니다.
 */
export class ConnectionPool {
  // ...
}
```

---

## 상황별 예시

### Angular 서비스

```typescript
/**
 * 사용자 인증 서비스
 *
 * 로그인, 로그아웃, 토큰 관리를 담당합니다.
 *
 * @example
 * ```typescript
 * const auth = inject(AuthService);
 * await auth.login(username, password);
 * if (auth.isAuthenticated()) {
 *   // ...
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * 현재 인증 상태
   */
  readonly isAuthenticated = signal(false);

  /**
   * 로그인 수행
   *
   * @param username - 사용자명
   * @param password - 비밀번호
   * @throws 인증 실패 시 AuthError
   */
  async login(username: string, password: string): Promise<void> {
    // ...
  }
}
```

### 확장 메서드 (Extension)

```typescript
declare global {
  interface Array<T> {
    /**
     * 배열에서 중복 제거
     *
     * @param keySelector - 중복 판단 기준 키 추출 함수 (선택)
     * @returns 중복이 제거된 새 배열
     *
     * @example
     * ```typescript
     * [1, 2, 2, 3].distinct(); // [1, 2, 3]
     * users.distinct(u => u.id); // id 기준 중복 제거
     * ```
     */
    distinct(keySelector?: (item: T) => unknown): T[];
  }
}
```

### 에러 클래스

```typescript
/**
 * 네트워크 요청 실패 에러
 *
 * @example
 * ```typescript
 * try {
 *   await fetch(url);
 * } catch (e) {
 *   throw new NetworkError("요청 실패", { cause: e, url });
 * }
 * ```
 */
export class NetworkError extends Error {
  /**
   * @param message - 에러 메시지
   * @param options - 추가 옵션
   */
  constructor(
    message: string,
    public readonly options?: { cause?: Error; url?: string }
  ) {
    super(message);
    this.name = "NetworkError";
  }
}
```

---

## 작성 원칙

### 한국어 작성
- 설명, 파라미터, 반환값 모두 한국어
- 기술 용어는 영어 허용 (Promise, async 등)

### 자명한 내용 생략
```typescript
// ❌ 불필요한 설명
/**
 * ID를 반환
 * @returns ID
 */
get id(): string { ... }

// ✅ 자명하면 간단히
/** 고유 식별자 */
readonly id: string;
```

### @example 필수 상황
- public API
- 사용법이 명확하지 않은 경우
- 여러 사용 패턴이 있는 경우
