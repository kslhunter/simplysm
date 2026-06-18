# @simplysm/sd-orm-common-ext

`@simplysm/sd-orm-common` 위에 인증/사용자/시스템로그/데이터변경로그/순번코드용 테이블 모델과 `DbContext`·`Queryable` 확장 메서드를 미리 제공하는 ORM 부가 모듈. **패키지 전체가 `@deprecated` (더 이상 유지보수 안 됨)** — 신규 개발에는 사용하지 말 것.

## 사용 트리거 인덱스

- **DbContextExt** — `DbContext`를 상속해 인증/사용자설정/시스템로그/순번코드 처리 메서드와 7개 표준 테이블 `Queryable`을 한 번에 갖춘 DB 컨텍스트 베이스가 필요할 때.
- **IAuthInfo** — `authAsync` 의 인증 결과(인증키 + 사용자 정보·권한·설정 맵)를 받을 때.
- **Queryable.ext (데이터로그 확장)** — 임의 테이블의 `Queryable`에서 변경이력(SystemDataLog)을 조회·삽입할 때. `joinLastDataLog`/`joinFirstDataLog`/`insertDataLogAsync`/`insertDataLogPrepare`.
- **IInsertDataLogParam / IJoinDataLogItem** — 데이터로그 삽입 인자 / 조인 결과 형태.
- **테이블 모델** — DB 스키마 정의 대상. `User`/`UserConfig`/`UserPermission`/`Authentication`/`SystemLog`/`SystemDataLog`/`UniqueCode`.

## DbContextExt (extensions/DbContextExt.ts)

`abstract class DbContextExt extends DbContext` — 상속해 구체 컨텍스트를 만들면 아래 7개 표준 테이블 `Queryable` 멤버를 자동 보유: `uniqueCode`(UniqueCode), `systemDataLog`(SystemDataLog), `systemLog`(SystemLog), `authentication`(Authentication), `user`(User), `userConfig`(UserConfig), `userPermission`(UserPermission).

- `authAsync(authKey: Uuid): Promise<IAuthInfo>` — 인증키로 재인증. 호출 시 먼저 `lastDateTime`이 1일 이전인 `authentication` 레코드를 일괄 삭제(만료 정리)한 뒤, 키 일치 사용자를 조회. 못 찾으면 `"인증정보가 만료되었습니다..."` throw.
- `authAsync(loginId: string, encryptedPassword: string): Promise<IAuthInfo>` — 로그인아이디+암호화비밀번호로 인증. `isDeleted=false`인 사용자만 대상. 못 찾으면 `"직원 정보를 찾을 수 없습니다..."` throw. 성공 시 해당 userId의 `authentication`을 `upsert`(`key`=새 Uuid, `lastDateTime`=현재)하여 새 인증키 발급.
  - 두 오버로드 모두 반환 전 사용자의 `permissions`/`configs`를 include 후 `valueJson`을 `JsonConvert.parse`해 `permissionRecord`/`configRecord` 맵으로 변환.
- `setUserConfig(userId: number, key: string, val: any): Promise<void>` — `userConfig`에 (userId, code=key) 기준 upsert. `val`은 `JsonConvert.stringify`로 직렬화되어 `valueJson`에 저장.
- `getUserConfig(userId: number, key: string): Promise<any>` — (userId, code=key) 단건 조회 후 `valueJson`을 `JsonConvert.parse`해 반환. 레코드 없으면 `undefined`.
- `writeSystemLog(userId: number | undefined, clientName: string, severity: "error" | "warn" | "log", ...logs: any[]): Promise<void>` — `systemLog` 1건 삽입. `severity` = 로그 구분(`type` 컬럼). `dateTime`=현재. `logs`는 `util.format(...logs)`로 한 문자열(`message`)로 합쳐 저장.
- `createUniqueCodes(option: { prefix: string; seqLength?: number; count: number }): Promise<string[]>` — `prefix`로 시작하는 기존 `uniqueCode` 중 최대 `seq`(없으면 0)를 `lock()`으로 잠그며 조회 후, 그 다음 번호부터 `count`개의 순번 코드를 생성·삽입하고 코드 문자열 배열 반환.
  - `prefix`: 코드 앞에 붙는 고정 접두사이자 시퀀스 분리 기준. `seqLength`: 지정 시 순번을 그 길이로 `padStart("0")` 제로패딩, 미지정 시 패딩 없이 숫자 그대로. `count`: 생성 개수.

### IAuthInfo

```ts
interface IAuthInfo<T extends Record<string, any> = Record<string, any>> {
  key: Uuid;          // 발급/확인된 인증키
  user: {
    id: number;                          // 사용자 PK
    name: string;                        // 사용자 이름
    email: string | undefined;           // 이메일(없을 수 있음)
    permissionRecord: Record<string, any>; // UserPermission.code → parse(valueJson) 맵
    configRecord: T;                       // UserConfig.code → parse(valueJson) 맵 (제네릭 T로 타입 지정 가능)
  };
}
```

## Queryable.ext — 데이터로그 확장 (extensions/Queryable.ext.ts)

`declare module`로 `@simplysm/sd-orm-common`의 `Queryable<D, T>` 프로토타입에 메서드 4개를 주입(import 만으로 활성화, `index.ts`가 재노출). 어느 테이블 `Queryable`이든 `SystemDataLog`와 연계됨. 매칭 키는 대상 쿼리어블의 `id` 컬럼 ↔ `SystemDataLog.itemId`, `tableName` ↔ 대상 `tableName`.

- `joinLastDataLog(opt?): Queryable<D, T & { lastDataLog: IJoinDataLogItem }>` — 각 행에 해당 항목의 **가장 최근**(`dateTime` DESC, `top(1)`) 데이터로그를 `lastDataLog`로 조인.
- `joinFirstDataLog(opt?): Queryable<D, T & { firstDataLog: IJoinDataLogItem }>` — 각 행에 해당 항목의 **가장 처음**(`dateTime` ASC, `top(1)`) 데이터로그를 `firstDataLog`로 조인.
  - `opt.includeTypes?: string[]` — 지정 시 `type IN (...)` 필터로 해당 구분만 대상.
  - `opt.excludeTypes?: string[]` — 지정 시 `type NOT IN (...)` 필터로 해당 구분 제외.
  - (둘 다 내부적으로 `tableName`, `itemId` 순 정렬 후 `dateTime`으로 정렬 — MySQL 인덱싱용. 조인 결과는 `user`를 include해 `userName`까지 채움.)
- `insertDataLogAsync(log: IInsertDataLogParam): Promise<number[]>` — 대상 쿼리어블의 `tableName`/`tableDescription`, `db.lastConnectionDateTime`을 자동 채워 `systemDataLog` 1건 즉시 삽입, 생성된 `id` 배열 반환.
- `insertDataLogPrepare(log: IInsertDataLogParam): void` — 위와 동일 항목을 즉시 실행 대신 `insertPrepare`로 예약(배치 커밋 대기). 반환 없음.

### IInsertDataLogParam

```ts
interface IInsertDataLogParam {
  type: string;                   // 로그 구분(예: insert/update/delete 등 호출자 정의 문자열)
  itemId: number;                 // 로그 대상 항목의 PK
  valueJson: string | undefined;  // 변경 값 스냅샷(JSON 문자열). 없으면 undefined
  userId: number | undefined;     // 작업 사용자 ID. 없으면 undefined
}
```

### IJoinDataLogItem

```ts
interface IJoinDataLogItem {
  type: string | undefined;       // 조인된 로그의 구분
  dateTime: DateTime | undefined; // 로그 일시
  userId: number | undefined;     // 작업 사용자 ID
  userName: string | undefined;   // 작업 사용자 이름(SystemDataLog.user.name)
}
```

## 테이블 모델 (models/)

모두 `@Table`/`@Column` 데코레이터 기반 ORM 엔티티. `@deprecated`. 필드 끝 `!`는 NOT NULL, `?`는 nullable/optional.

### User — `@Table({ description: "사용자" })`
- `id?: number` — PK, `autoIncrement`.
- `name: string` — 이름. `@Index()`.
- `email?: string` — 이메일, nullable.
- `loginId?: string` — 로그인아이디, nullable. `@Index()`.
- `encryptedPassword?: string` — 암호화된 비밀번호, nullable.
- `isDeleted: boolean` — 삭제 여부(soft delete 플래그).
- `configs?: Readonly<UserConfig>[]` — `@ForeignKeyTarget(UserConfig, "user")` 역참조 설정 목록.
- `permissions?: Readonly<UserPermission>[]` — `@ForeignKeyTarget(UserPermission, "user")` 역참조 권한 목록.

### UserConfig — `@Table({ description: "사용자설정" })`
- `userId: number` — PK1, 사용자 ID.
- `code: string` — PK2, 설정 코드(키).
- `valueJson: string` — 값(JSON 문자열). `dataType STRING/MAX`.
- `user?: Readonly<User>` — `@ForeignKey(["userId"], User)`.

### UserPermission — `@Table({ description: "사용자권한" })`
- `userId: number` — PK1, 사용자 ID.
- `code: string` — PK2, 권한 코드.
- `valueJson: string` — 값(JSON 문자열). `dataType STRING/MAX`.
- `user?: Readonly<User>` — `@ForeignKey(["userId"], User)`.

### Authentication — `@Table({ description: "인증" })`
- `key: Uuid` — PK1, 인증키.
- `userId: number` — 사용자 ID. `@Index({ unique: true })` (사용자당 1행).
- `lastDateTime: DateTime` — 최종인증일시(`authAsync`의 1일 만료 기준).
- `user?: Readonly<User>` — `@ForeignKey(["userId"], User)`.

### SystemLog — `@Table({ description: "시스템 로그" })`
- `id?: number` — PK, `autoIncrement`.
- `clientName: string` — 클라이언트명.
- `dateTime: DateTime` — 발생일시.
- `type: string` — 구분(`writeSystemLog`의 severity: "error"/"warn"/"log" 저장).
- `message: string` — 메시지. `dataType STRING/MAX`.
- `userId?: number` — 사용자 ID, nullable.
- `user?: Readonly<User>` — `@ForeignKey(["userId"], User)`.

### SystemDataLog — `@Table({ description: "시스템 데이터 로그" })`
- `id?: number` — PK, `autoIncrement`.
- `tableName: string` — 테이블명. `@Index("tableItem", order:1)`.
- `tableDescription?: string` — 테이블설명, nullable.
- `type: string` — 구분(변경 종류).
- `itemId?: number` — 항목 ID, nullable. `@Index("tableItem", order:2)`.
- `valueJson?: string` — 값(JSON), nullable. `dataType STRING/MAX`.
- `dateTime: DateTime` — 일시. `@Index({ orderBy: "DESC" })`.
- `userId?: number` — 사용자 ID, nullable.
- `user?: Readonly<User>` — `@ForeignKey(["userId"], User)`.

### UniqueCode — `@Table({ description: "코드정보" })`
- `code: string` — PK1. `prefix? + seq` 형태의 생성 코드(`createUniqueCodes` 산출물).
- `seq: number` — 순번.
