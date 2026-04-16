# sd-testing: 테스트 작성 규칙

## 모킹 원칙

**CRITICAL: 모든 코드는 기본적으로 실제로 실행시킨다. mock은 최후의 수단이다.**

### 모킹 결정 플로우차트

mock을 작성하기 **전에** 반드시 아래 순서로 판단한다:

1. **이 의존성을 실제로 실행하면 테스트가 물리적으로 돌아가는가?**
   - 돌아간다 → **모킹 금지. 실제 코드를 실행한다.**
   - 돌아가지 않는다 → 2번으로
2. **왜 물리적으로 불가능한가? 아래 화이트리스트에 해당하는가?**
   - 해당한다 → 모킹 허용 (최소 범위로)
   - 해당하지 않는다 → **모킹 금지. 테스트 설계를 재고한다.**

### 모킹 허용 화이트리스트

아래 항목**만** 모킹이 허용된다. 이 목록에 없으면 모킹하지 않는다:

| 허용 대상 | 예시 | 이유 |
|-----------|------|------|
| 외부 네트워크 요청 | HTTP API 호출, WebSocket 서버 연결 | 외부 서버가 테스트 환경에 없음 |
| 데이터베이스 연결 | DB 커넥션, 쿼리 실행 | DB 인스턴스가 테스트 환경에 없을 때만 (Docker로 띄울 수 있으면 실제 DB 사용) |
| 하드웨어/OS 의존 | USB 장치, 파일시스템의 특수 권한, 네이티브 플러그인 | 물리 장치가 없음 |
| 타이머/시간 | `Date.now()`, `setTimeout` | `vi.useFakeTimers()`로 제어 (이것은 mock이 아닌 테스트 유틸리티) |

**다음은 모킹 대상이 아니다:**
- 같은 패키지의 다른 모듈/클래스 → 실제 인스턴스를 생성해서 사용
- 유틸리티 함수, 순수 함수 → 그냥 실행
- 설정/config 객체 → 테스트용 실제 값을 만들어서 주입
- 에러 핸들링 로직 → 실제 에러를 발생시켜서 테스트
- 이벤트 핸들러/콜백 → 실제로 이벤트를 발생시켜서 테스트

### 모킹 세부 규칙

- `vi.mock()` 하나가 모듈 전체를 대체하므로, 순수 함수까지 함께 가짜로 바뀐다. 혼합 모듈은 `importOriginal`로 실제 구현을 최대한 살린다.
- **모킹이 실제 로직을 복제하면 모킹이 불필요하다는 증거다.** 모킹 코드가 원본 코드와 동일하거나 유사하면, 그 모킹을 삭제하고 실제 모듈을 쓴다.
- **호출 여부만 확인하려면 `vi.mock()`이 아니라 `vi.spyOn()`을 쓴다.** mock은 구현을 가짜로 대체하고, spy는 실제 코드를 실행하면서 호출을 추적한다.

### Bad/Good 예시

#### 예시 1: 같은 패키지의 유틸리티 함수

```typescript
// ❌ BAD: 실행 가능한 유틸 함수를 모킹
vi.mock("../utils/string-utils", () => ({
  formatName: vi.fn().mockReturnValue("formatted"),
}));

test("이름을 포맷한다", () => {
  const result = service.process("raw");
  expect(formatName).toHaveBeenCalledWith("raw");  // 구현 결합
  expect(result).toBe("formatted");
});
```

```typescript
// ✅ GOOD: 실제 유틸 함수를 실행
import { formatName } from "../utils/string-utils";

test("이름을 포맷한다", () => {
  const result = service.process("raw");
  expect(result).toBe("Raw");  // 실제 결과를 검증
});
```

#### 예시 2: 클래스 의존성

```typescript
// ❌ BAD: 같은 패키지의 클래스를 통째로 모킹
const mockParser = {
  parse: vi.fn().mockReturnValue({ type: "text", value: "hello" }),
  validate: vi.fn().mockReturnValue(true),
};

test("파서를 사용해 변환한다", () => {
  const converter = new Converter(mockParser as any);
  converter.convert("hello");
  expect(mockParser.parse).toHaveBeenCalled();  // 구현 결합
});
```

```typescript
// ✅ GOOD: 실제 파서 인스턴스를 사용
test("파서를 사용해 변환한다", () => {
  const parser = new Parser();
  const converter = new Converter(parser);
  const result = converter.convert("hello");
  expect(result).toEqual({ type: "text", value: "hello" });  // 동작 결과를 검증
});
```

#### 예시 3: 외부 API (모킹이 정당한 경우)

```typescript
// ✅ OK: 외부 HTTP 서버는 테스트 환경에 없으므로 모킹 허용
vi.spyOn(httpClient, "get").mockResolvedValue({ status: 200, data: { id: 1 } });

test("사용자 정보를 조회한다", async () => {
  const user = await userService.getUser(1);
  expect(user.id).toBe(1);  // 반환값을 검증 (호출 여부가 아님)
});
```

## 검증 원칙

- **구현 결합 검증 금지.** mock으로 호출 횟수·인자를 검증하는 것은 구현 세부사항에 결합된다. 동작의 결과(반환값, 상태 변화, 사이드이펙트)를 검증한다.
- 호출 여부 검증이 꼭 필요하면 spy를 쓰되, "몇 번 호출됐는가"보다 **"올바른 결과가 나왔는가"** 를 우선한다.
