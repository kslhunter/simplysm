# @simplysm/sd-core-common

브라우저/Node 공용 코어 유틸 — 날짜·시간 타입, 배열/Map/Set 프로토타입 확장, 객체 복제·검증·비교, JSON/CSV/XML/Worker 직렬화, 비동기 큐·대기, ZIP, 데코레이터, 에러 클래스.

import 시 `Array`/`Map`/`Set` 프로토타입이 전역 확장된다(`index.ts` 가 `Array.ext`/`Map.ext`/`Set.ext` 를 side-effect import). `reflect-metadata` 도 자동 import 된다.

## 사용 트리거 인덱스

- **배열 확장 메서드** — 배열에서 `groupBy`/`toMap`/`distinct`/`orderBy`/`diffs`/`mapAsync`/`sum` 등 LINQ 류 조작이 필요할 때. 전역 프로토타입 확장. 자세히: [array-ext.md](./array-ext.md)
- **`ObjectUtils`** — 객체 깊은복제·동등비교·병합·체인경로 접근·유효성검증이 필요할 때. 자세히: [object-utils.md](./object-utils.md)
- **`DateOnly` / `DateTime` / `Time`** — 날짜만/날짜+시간/시간만 값을 불변 객체로 다루고 파싱·포맷·증감·주차계산할 때. 자세히: [date-time.md](./date-time.md)
- **`Map.ext` / `Set.ext`** — `Map.getOrCreate`/`Map.update`, `Set.adds`/`Set.toggle` 가 필요할 때. (아래 인라인)
- **`JsonConvert`** — DateTime/Set/Map/Error/Buffer 등 특수타입을 포함한 객체를 JSON 직렬화·복원할 때. (아래 인라인)
- **`CsvConvert`** — CSV 문자열을 2차원 배열로 파싱할 때(따옴표 처리 포함). (아래 인라인)
- **`XmlConvert`** — XML 문자열 ↔ 객체 변환이 필요할 때. (아래 인라인)
- **`TransferableConvert`** — Worker thread 로 특수타입 포함 객체를 transfer 하며 주고받을 때. (아래 인라인)
- **`Uuid`** — UUID v4 생성·Buffer 변환이 필요할 때. (아래 인라인)
- **`Wait`** — 일정 시간 또는 조건 충족까지 비동기 대기할 때. (아래 인라인)
- **`SdAsyncFnDebounceQueue` / `SdAsyncFnSerialQueue`** — 비동기 작업을 디바운스(마지막만) 또는 순차(FIFO) 실행할 때. (아래 인라인)
- **`SdZip`** — ZIP 데이터(Blob/Buffer)에서 파일을 추출하거나 새로 압축할 때. (아래 인라인)
- **`SdError` 계열** — 트리형 inner-error 체이닝 에러나 표준 의미 에러(인수/미구현/도달불가/타임아웃)를 던질 때. (아래 인라인)
- **`NumberUtils` / `MathUtils` / `StringUtils`** — 숫자 파싱·포맷, 난수, 한글조사·케이스·전각변환이 필요할 때. (아래 인라인)
- **`NetUtils`** — URL 을 진행률 콜백과 함께 Buffer 로 다운로드할 때. (아래 인라인)
- **`DateTimeFormatUtils`** — C# 스타일 날짜포맷 문자열을 직접 적용할 때(보통 DateOnly/DateTime/Time 내부에서 사용). (아래 인라인)
- **`FnUtils`** — 함수 소스에서 파라미터명·return 식을 문자열로 추출할 때. (아래 인라인)
- **데코레이터** — (`NotifyPropertyChange` / `PropertyValidate` / `PropertyGetSetDecoratorBase`) 클래스 속성의 get/set 을 가로채 변경알림·검증을 걸 때. (아래 인라인)
- **템플릿 문자열 태그** — (`html`/`javascript`/`typescript`/`string`/`tsql`/`mysql`) 멀티라인 리터럴의 공통 들여쓰기를 자동 제거할 때. (아래 인라인)
- **타입 유틸** — (`Type`/`TFlatType`/`DeepPartial`/`WrappedType`/`UnwrappedType`/`TreeMap`/`LazyGcMap`) 제네릭 타입 헬퍼 및 특수 컬렉션. (아래 인라인)

---

## Map.ext / Set.ext (전역 프로토타입 확장)

import 만으로 `Map`/`Set` 프로토타입에 메서드가 추가된다.

- `Map<K,V>.getOrCreate(key, newValue: V): V` — 키 있으면 그 값, 없으면 `newValue` 를 set 후 반환.
- `Map<K,V>.getOrCreate(key, newValueFn: () => V): V` — 없을 때만 팩토리 호출(함수면 lazy 생성). 비싼 초기값에 사용.
- `Map<K,V>.update(key, updateFn: (v: V | undefined) => V): void` — 현재값(없으면 undefined)을 받아 변환한 결과를 다시 set.
- `Set<T>.adds(...values: T[]): this` — 여러 값을 한 번에 add 하고 체인 가능한 this 반환.
- `Set<T>.toggle(value, addOrDel?: "add" | "del"): this` — `"add"`면 무조건 추가, `"del"`이면 무조건 삭제, 생략 시 있으면 삭제·없으면 추가(토글).

## JsonConvert

특수타입을 `{ __type__, data }` 래핑으로 보존하는 JSON 직렬화/역직렬화.

- `JsonConvert.stringify(obj, options?): string`
  - `options.space?: string | number` — JSON.stringify 의 들여쓰기(pretty print).
  - `options.replacer?: (key, value) => any` — 표준 replacer 보다 먼저 적용되는 사용자 변환.
  - `options.hideBuffer?: boolean` — true 면 Buffer 의 data 를 `"__hidden__"` 으로 치환(로그 노출 방지).
  - 자동 보존 타입: `Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Set`/`Map`/`Error`. Error 는 name/message/stack 및 code/detail/cause(있을 때) 포함.
- `JsonConvert.parse<T = any>(json): T` — 위 `__type__` 래핑과 `{type:"Buffer"}` 를 원래 인스턴스로 복원하고, 모든 null 을 undefined 로 치환(`ObjectUtils.nullToUndefined`). 파싱 실패 시 원문을 포함한 `SdError` throw.

## CsvConvert

- `CsvConvert.parse(content, columnSplitter): (string | undefined)[][]` — `\r\n` 기준 행 분리, `columnSplitter`(예: `","`, `"\t"`)로 열 분리. 큰따옴표로 감싼 셀 내부의 구분자·`""`(이스케이프된 따옴표)를 처리. 빈 셀은 `undefined`, 값은 trim. 행별 열 개수가 첫 행과 다르면 Error throw.

## XmlConvert

fast-xml-parser 래퍼. 속성은 `$`, 텍스트노드는 `_` 키에 담긴다.

- `XmlConvert.parse(str, options?)` — 속성값·태그값은 파싱하지 않고 문자열 유지. 깊이 2 이상(`jPath`에 `.` 포함)인 비속성 노드는 배열로 강제. `options.stripTagPrefix?: boolean` true 면 태그명의 `ns:` 네임스페이스 prefix 제거(속성 `$` 는 유지).
- `XmlConvert.stringify(obj, options?: XmlBuilderOptions)` — 객체를 XML 문자열로 빌드. `options` 는 fast-xml-parser `XmlBuilderOptions` 와 병합(기본값 위에 덮어씀).

## TransferableConvert (Worker thread)

`worker_threads` postMessage 용. 특수타입을 구조체로 인코딩하고 Buffer/Uint8Array 의 ArrayBuffer 를 transferList 로 모은다.

- `TransferableConvert.encode(obj): { result: any; transferList: Transferable[] }` — `result` 는 전송용 객체, `transferList` 는 zero-copy 이전 대상(ArrayBuffer 목록). DateTime/DateOnly/Time→`{__type__,data:tick}`, Uuid→문자열, Error→직렬화 구조체(code/detail/cause 포함). Array/Map/Set/일반객체 재귀.
- `TransferableConvert.decode(obj): any` — encode 의 역변환. 수신측에서 원래 인스턴스 복원. 배열/객체는 in-place 로 변환.

## Uuid

- `Uuid.new(): Uuid` — crypto.getRandomValues 기반 UUID v4 생성(미지원 환경은 Math.random fallback).
- `Uuid.fromBuffer(buffer): Uuid` — 16바이트 Buffer 로 생성(길이≠16 이면 Error).
- `new Uuid(uuid: string)` — 문자열로 래핑.
- `.toString(): string` / `.toBuffer(): Buffer` — 문자열/16바이트 Buffer 변환.

## Wait

- `Wait.time(millisecond): Promise<void>` — 지정 ms 동안 대기(setTimeout 래핑).
- `Wait.until(forwarder, milliseconds?, timeout?): Promise<void>` — `forwarder()`(bool/Promise<bool>)가 true 가 될 때까지 `milliseconds`(기본 100) 간격 폴링. `timeout` 지정 시 누적 대기가 초과하면 `TimeoutError` throw.

## SdAsyncFnDebounceQueue / SdAsyncFnSerialQueue

둘 다 `EventEmitter` 상속, `on("error", (err: SdError) => void)` 로 작업 중 예외 수신(예외는 throw 되지 않고 이벤트로 emit). `run(fn: () => void | Promise<void>)` 로 작업 등록.

- `SdAsyncFnDebounceQueue` — `new SdAsyncFnDebounceQueue(delay?: number)`. `delay` ms 후 마지막으로 등록된 fn 하나만 실행(이전 대기 fn 들은 버려짐). 실행 중 들어온 호출은 끝난 뒤 최신 것만 이어서 실행. 검색입력·자동저장·상태동기화에.
- `SdAsyncFnSerialQueue` — `new SdAsyncFnSerialQueue(gap: number = 0)`. 등록 순서(FIFO)대로 순차 실행, 작업 사이에 `gap` ms 대기. 동시성 1 보장이 필요할 때.

## SdZip

`@zip.js/zip.js` 래퍼. 추출 결과를 내부 캐시(파일명→Buffer)에 보관하며 `write` 로 추가/수정 후 재압축 가능.

- `new SdZip(data?: Blob | Buffer)` — 기존 ZIP 로딩(생략 시 빈 ZIP).
- `extractAllAsync(progressCallback?): Promise<Map<string, Buffer | undefined>>` — 전체 추출. 콜백 인자 `{ fileName, totalSize, extractedSize }`(바이트). 디렉토리 엔트리는 제외.
- `getAsync(fileName): Promise<Buffer | undefined>` — 단일 파일 추출(캐시 우선, 없으면 undefined 캐싱).
- `existsAsync(fileName): Promise<boolean>` — 파일 존재 여부.
- `write(fileName, buffer): void` — 캐시에 파일 추가/덮어쓰기(메모리만).
- `compressAsync(): Promise<Buffer>` — 캐시 전체(extractAll 포함)를 ZIP Buffer 로 압축.
- `closeAsync(): Promise<void>` — 내부 reader 해제.

## 에러 클래스 (SdError 계열)

- `SdError` — `Error` 상속, inner-error 트리 체이닝. `new SdError(innerError: Error, ...messages)` 또는 `new SdError(...messages)`. 메시지들은 역순으로 `" => "` 연결, `name` 은 실제 서브클래스명. innerError 지정 시 `.innerError` 보관 및 stack 에 inner stack append.
- `ArgumentError(argObj)` / `ArgumentError(message, argObj)` — 인수 오류. argObj 를 YAML 로 stringify 해 메시지에 붙임(기본 메시지 "인수가 잘못되었습니다.").
- `NotImplementError(message?)` — "구현되어있지 않습니다" (+message).
- `NeverEntryError(message?)` — "절대 진입될 수 없는것으로 판단된 코드에 진입되었습니다" (+message). switch default 등 도달불가 분기에.
- `TimeoutError(millisecond?, message?)` — "대기시간이 초과되었습니다" + `(ms)` + message. `Wait.until` 타임아웃이 던짐.

## NumberUtils / MathUtils / StringUtils

`NumberUtils` (정적):
- `parseInt(text, radix = 10): number | undefined` — 숫자면 반올림 반환, 문자열이면 숫자/`.`/`-` 외 제거 후 parseInt. NaN/undefined 면 undefined.
- `parseFloat(text): number | undefined` — 위와 동일하나 실수 파싱.
- `parseRoundedInt(text): number | undefined` — parseFloat 후 `Math.round`.
- `isNullOrEmpty(val): val is 0 | undefined | null` — null/undefined 또는 0 이면 true(타입가드).
- `format(val, digit?: { max?, min? }): string | undefined` — `toLocaleString`(천단위 구분). `digit.max`/`digit.min` 은 최대/최소 소수 자리. val 이 undefined 면 undefined.

`MathUtils` (정적):
- `getRandomInt(min, max): number` — `min` 이상 `max` 미만 정수.

`StringUtils` (정적):
- `getSuffix(text, type: "을"|"은"|"이"|"와"|"랑"|"로"|"라"): string` — text 마지막 글자의 받침 유무로 한글 조사 선택(예 받침有→"을", 받침無→"를").
- `replaceSpecialDefaultChar(str): string` — 전각 영문/숫자/공백/괄호를 반각으로 치환.
- `toPascalCase(str)` / `toCamelCase(str)` / `toKebabCase(str)` — `-`·`.`·`_` 경계 기준 케이스 변환.
- `isNullOrEmpty(str): str is "" | undefined | null` — null/undefined/빈문자 타입가드.
- `insert(str, index, insertString): string` — index 위치에 문자열 삽입.

## NetUtils

- `NetUtils.downloadBufferAsync(url, options?): Promise<Buffer>` — fetch GET 으로 응답 본문을 Buffer 로 누적.
  - `options.progressCallback?: (p: { contentLength: number; receivedLength: number }) => void` — chunk 마다 호출. 단, `Content-Length` 헤더가 있어야(>0) 호출됨.
  - `options.signal?: AbortSignal` — 취소용.

## DateTimeFormatUtils

- `DateTimeFormatUtils.format(format, args): string` — C# 커스텀 날짜포맷. `args`: `{ year?, month?, day?, hour?, minute?, second?, millisecond?, timezoneOffsetMinutes? }`(제공된 필드만 치환). 보통 `DateOnly`/`DateTime`/`Time`.toFormatString 이 내부 사용.
  - 토큰: `yyyy`(4자리연), `yy`(2자리), `MM`/`M`(월, 0패딩 여부), `dd`/`d`(일), `ddd`(한글요일 일~토), `HH`/`H`(24시), `hh`/`h`(12시), `tt`(오전/오후), `mm`/`m`(분), `ss`/`s`(초), `fff`/`ff`/`f`(밀리초 3/2/1자리), `zzz`(±HH:mm), `zz`(±HH), `z`(±H).

## FnUtils

- `FnUtils.parse(fn): { params: string[]; returnContent: string }` — 함수 소스 문자열을 정규식 분석해 파라미터명 배열과 `return` 식(문자열)을 추출. `function` 키워드형·화살표형 지원. 파싱 실패 시 Error. ORM 식 표현 등 함수→문자열 변환에.

## 데코레이터

레거시 데코레이터(`target`, `propertyName`, `descriptor`) 시그니처. `PropertyGetSetDecoratorBase` 가 reflect-metadata 로 저장공간을 만들고 get/set 을 재정의한다.

- `NotifyPropertyChange(): TPropertyDecoratorReturn<any>` — 속성에 붙이면 set 직후 해당 인스턴스의 `onPropertyChange(propertyName, oldValue, newValue)` 호출. 클래스는 `INotifyPropertyChange` 구현 필요.
- `INotifyPropertyChange` — `onPropertyChange<K extends keyof this>(propertyName: K, oldValue: this[K], newValue: this[K]): void` 콜백 계약.
- `PropertyValidate(def: TValidateDef<any>, replacer?: TPropertyValidateReplacer): TPropertyDecoratorReturn<any>` — set 전에 `replacer`(있으면)로 값 변환 후 `ObjectUtils.validate(value, def)` 실행, 위반 시 Error throw(컴포넌트명·속성명·값·위반키 포함). `def` 형식은 [object-utils.md](./object-utils.md) 의 `TValidateDef` 참조.
- `TPropertyValidateReplacer = (value: any) => any` — 검증 전 값 치환 함수.
- `PropertyGetSetDecoratorBase<O, K>(arg: IPropertyGetSetDecoratorBaseParam<O, K>): TPropertyDecoratorReturn<O, K>` — get/set 가로채기 기반.
  - `arg.beforeSet?(target, propertyName, oldValue, newValue): O[K] | undefined` — set 전 호출. 반환값이 undefined 아니면 그 값으로 대체.
  - `arg.afterSet?(target, propertyName, oldValue, newValue): void` — set 직후 호출.
  - `arg.get?(target, propertyName, value): void` — get 시 호출(값 변경 불가, side-effect 용).
- `TClassDecoratorReturn<T> = (classType: Type<T>) => void` — 클래스 데코레이터 반환 타입 alias.
- `TPropertyDecoratorReturn<T, N = string> = (target: T, propertyName: N, inputDescriptor?: PropertyDescriptor) => void` — 속성 데코레이터 반환 타입 alias.

## 템플릿 문자열 태그

- `html` / `javascript` / `typescript` / `string` / `tsql` / `mysql` `(strings: TemplateStringsArray, ...values): string` — 모두 동일 동작(이름은 에디터 문법 하이라이트용). `String.raw` 로 보간 후: 첫/마지막 공백-only 줄 제거, 비어있지 않은 줄들의 최소 들여쓰기만큼 모든 줄에서 제거. 멀티라인 SQL/HTML 리터럴 정렬용.

## 타입 유틸

- `Type<T>` — `interface Type<T> extends Function { new (...args): T }`. 클래스 생성자 타입. `ofType`/`validate` 등에서 런타임 타입 인자로 사용.
- `TFlatType` — `undefined | number | string | boolean | Number | String | Boolean | DateOnly | DateTime | Time | Uuid | Buffer`. "더 깊이 들어가지 않는 값" 집합. `DeepPartial` 재귀 종료·`merge3` 제약에 사용.
- `DeepPartial<T>` — 중첩까지 모두 optional, 단 `TFlatType` 필드는 그대로 유지.
- `WrappedType<T>` — `string→String`, `number→Number`, `boolean→Boolean`(그 외 그대로). 런타임 생성자 비교용.
- `UnwrappedType<T>` — 위의 역(`String→string` 등).
- `TreeMap<T>` — 다단계 키 배열로 값 저장하는 중첩 Map. `set(keys: any[], val)`, `get(keys): T | undefined`, `getOrCreate(keys, value): T`, `clear()`. 키 배열의 앞부분은 중간 Map 경로, 마지막 키가 실제 슬롯. (내부적으로 `Array.last`/`Map.getOrCreate` 확장 사용.)
- `LazyGcMap<K, V>` — 접근시각 기반 LRU 자동만료 Map. `new LazyGcMap({ gcInterval, expireTime, onExpire? })`.
  - `gcInterval: number` — GC 스윕 주기(ms).
  - `expireTime: number` — 마지막 접근 후 만료까지(ms).
  - `onExpire?: (key, value) => void | Promise<void>` — 만료 항목별 콜백(예외 무시).
  - `get`/`getOrCreate` 는 접근시각 갱신(LRU). `set`/`get`/`has`/`delete`/`clear`/`values()`/`size`. 데이터가 비면 타이머 자동 중지, 들어오면 재가동.
