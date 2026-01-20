---
paths:
  - "**/*.ts"
---

# @simplysm 유틸리티 인덱스

코드를 구현하기 전에 아래 목록의 유사 기능을 최대한 활용한다.

## core-common

### 객체 처리 (ObjectUtils)
| 함수 | 용도 |
|------|------|
| `clone(obj)` | 깊은 복사 (순환 참조 지원) |
| `equal(a, b)` | 깊은 비교 |
| `merge(base, target)` | 깊은 병합 |
| `merge3(source, origin, target)` | 3-way 병합 (충돌 감지) |
| `omit(obj, keys)` | 특정 키 제외 |
| `pick(obj, keys)` | 특정 키만 선택 |
| `clearUndefined(obj)` | undefined 제거 |
| `getChainValue(obj, "a.b[0].c")` | 경로 기반 값 조회 |
| `setChainValue(obj, "a.b[0].c", v)` | 경로 기반 값 설정 |

### 문자열 처리 (StringUtils)
| 함수 | 용도 |
|------|------|
| `isNullOrEmpty(str)` | 빈 문자열 체크 |
| `toCamelCase(str)` | camelCase 변환 |
| `toPascalCase(str)` | PascalCase 변환 |
| `toKebabCase(str)` | kebab-case 변환 |
| `getSuffix("책", "을")` | 한글 조사 자동 처리 |

### 숫자 처리 (NumberUtils)
| 함수 | 용도 |
|------|------|
| `parseInt(str)` | 파싱 (비숫자 자동 제거) |
| `parseFloat(str)` | 파싱 (비숫자 자동 제거) |
| `format(num, opts)` | 천단위 포맷팅 |

### 배열 확장 (Array.prototype)
| 메서드 | 용도 |
|--------|------|
| `groupBy(fn)` | 그룹핑 |
| `toMap(fn)` | Map 변환 |
| `toObject(fn)` | Record 변환 |
| `distinct()` | 중복 제거 |
| `orderBy(fn)` / `orderByDesc(fn)` | 정렬 |
| `diffs(target)` | 차이 비교 |
| `sum(fn)` / `min(fn)` / `max(fn)` | 집계 |
| `filterAsync(fn)` / `mapAsync(fn)` | 비동기 처리 |
| `single()` / `first()` / `last()` | 단일 요소 조회 |

### Map/Set 확장
| 메서드 | 용도 |
|--------|------|
| `map.getOrCreate(key, default)` | 없으면 생성 |
| `set.toggle(item)` | 추가/제거 토글 |

### 타입
| 타입 | 용도 |
|------|------|
| `DateTime` | 날짜+시간 (불변) |
| `DateOnly` | 날짜만 |
| `Time` | 시간만 |
| `Uuid` | UUID v4 |

### JSON 변환 (JsonConvert)
| 함수 | 용도 |
|------|------|
| `stringify(obj)` | DateTime/Uuid 등 커스텀 타입 지원 |
| `parse(str)` | DateTime/Uuid 등 커스텀 타입 지원 |

### 비동기 (Wait)
| 함수 | 용도 |
|------|------|
| `until(fn, interval, timeout)` | 조건 대기 |
| `time(ms)` | 고정 대기 |

### 큐
| 클래스 | 용도 |
|--------|------|
| `DebounceQueue` | 디바운스 (마지막 요청만 실행) |
| `SerialQueue` | 순차 실행 |

### 에러
| 클래스 | 용도 |
|--------|------|
| `SdError` | cause 체인 지원 |
| `ArgumentError` | 인수 오류 (YAML 출력) |
| `TimeoutError` | 타임아웃 |

## core-node

### 경로 처리 (PathUtils)
| 함수 | 용도 |
|------|------|
| `posix(...args)` | POSIX 스타일 경로 변환 |
| `norm(...paths)` | 경로 정규화 |
| `removeExt(path)` | 확장자 제거 |
| `isChildPath(child, parent)` | 자식 경로 여부 |

### 파일 시스템 (FsUtils)
| 함수 | 용도 |
|------|------|
| `exists(path)` | 존재 확인 |
| `mkdir(path)` | 디렉토리 생성 (재귀) |
| `rm(path)` / `rmAsync(path)` | 삭제 |
| `copy(src, dest)` / `copyAsync(src, dest)` | 복사 |
| `read(path)` / `readAsync(path)` | UTF-8 읽기 |
| `readJson<T>(path)` | JSON 읽기 (JsonConvert 사용) |
| `write(path, data)` / `writeAsync(path, data)` | 쓰기 (부모 디렉토리 자동 생성) |
| `writeJson(path, data)` | JSON 쓰기 |
| `glob(pattern)` / `globAsync(pattern)` | 글로브 패턴 검색 |

### 파일 감시 (SdFsWatcher)
| 메서드 | 용도 |
|--------|------|
| `watchAsync(paths)` | 파일 감시 시작 |
| `onChange(opt, cb)` | 변경 이벤트 핸들러 (이벤트 병합) |

### Worker (SdWorker)
| 함수/클래스 | 용도 |
|-------------|------|
| `SdWorker<T>` | 타입 안전한 Worker 래퍼 |
| `createSdWorker(methods)` | Worker 팩토리 |

## core-browser

### DOM 처리 (ElementUtils)
| 함수 | 용도 |
|------|------|
| `findAll(el, selector)` | 하위 요소 검색 |
| `findFirst(el, selector)` | 첫 번째 하위 요소 |
| `getParents(el)` | 모든 부모 요소 |
| `isVisible(el)` | 가시성 확인 |
| `copyElement(event)` | 클립보드 복사 |
| `pasteToElement(event)` | 클립보드 붙여넣기 |

### HTML 요소 (HtmlElementUtils)
| 함수 | 용도 |
|------|------|
| `repaint(el)` | 강제 리페인트 |
| `getRelativeOffset(el, parent)` | 상대 위치 계산 |
| `scrollIntoViewIfNeeded(container, target)` | 스크롤 위치 조정 |

### Blob (BlobUtils)
| 함수 | 용도 |
|------|------|
| `download(blob, fileName)` | 파일 다운로드 |

## excel

### 워크북 (ExcelWorkbook)
| 메서드 | 용도 |
|--------|------|
| `new ExcelWorkbook(bytes?)` | 워크북 생성/읽기 |
| `createWorksheet(name)` | 워크시트 생성 |
| `getWorksheet(name)` | 워크시트 조회 |
| `getBytes()` | 바이너리 출력 |

### 워크시트/셀
| 클래스 | 용도 |
|--------|------|
| `ExcelWorksheet` | 워크시트 (셀/행/열 접근) |
| `ExcelCell` | 셀 (값, 스타일, 병합) |
| `ExcelWrapper<T>` | Zod 스키마 기반 타입 안전 읽기/쓰기 |

### 유틸 (ExcelUtils)
| 함수 | 용도 |
|------|------|
| `stringifyAddr(point)` | 좌표 → "A1" 변환 |
| `parseCellAddrCode(addr)` | "A1" → {r, c} 변환 |

## orm-common

### 쿼리 빌더
| 함수/클래스 | 용도 |
|-------------|------|
| `DbContext` | DB 연결/트랜잭션 관리 기본 클래스 |
| `Table(name)` | 테이블 빌더 생성 |
| `View(name)` | 뷰 빌더 생성 |
| `queryable(table)` | 쿼리 빌더 생성 |

### Queryable 주요 메서드
| 메서드 | 용도 |
|--------|------|
| `select()` / `distinct()` | SELECT |
| `where()` / `search()` | 조건 |
| `join()` / `include()` | 조인 |
| `groupBy()` / `having()` | 그룹화 |
| `orderBy()` | 정렬 |
| `resultAsync()` / `singleAsync()` / `firstAsync()` | 조회 |
| `insertAsync()` / `updateAsync()` / `deleteAsync()` | CUD |

### 표현식 (expr)
| 함수 | 용도 |
|------|------|
| `expr.val(v)` | 값 표현식 |
| `expr.col(c)` | 컬럼 표현식 |
| `expr.eq()` / `expr.gt()` / `expr.lt()` | 비교 |
| `expr.sum()` / `expr.count()` / `expr.avg()` | 집계 |
| `expr.and()` / `expr.or()` | 논리 연산 |

### 검색 (parseSearchQuery)
| 함수 | 용도 |
|------|------|
| `parseSearchQuery(query)` | 검색어 → SQL LIKE 패턴 (OR/AND/NOT/와일드카드) |

## orm-node

### ORM 클래스
| 클래스 | 용도 |
|--------|------|
| `SdOrm<T>` | Node.js ORM 메인 클래스 |
| `DbConnFactory` | DB 연결 팩토리 (커넥션 풀) |

### DB 연결
| 클래스 | 용도 |
|--------|------|
| `MysqlDbConn` | MySQL 연결 |
| `MssqlDbConn` | MSSQL 연결 |
| `PostgresqlDbConn` | PostgreSQL 연결 |

## service-common

### 프로토콜
| 클래스 | 용도 |
|--------|------|
| `ServiceProtocol` | 메시지 인코더/디코더 (자동 청킹) |
| `ServiceEventListener<TInfo, TData>` | 이벤트 리스너 정의 |

### 서비스 인터페이스
| 서비스 | 용도 |
|--------|------|
| `OrmService` | DB 연결/쿼리 |
| `CryptoService` | 암호화/복호화 |
| `SmtpService` | 이메일 발송 |

## service-client

### 클라이언트
| 클래스 | 용도 |
|--------|------|
| `ServiceClient` | 서버 통신 메인 클라이언트 |
| `OrmClientConnector` | ORM DB 연결 관리 |
| `EventClient` | 이벤트 구독/발행 |
| `FileClient` | 파일 업로드/다운로드 |

## service-server

### 서버
| 클래스 | 용도 |
|--------|------|
| `ServiceServer<TAuthInfo>` | 마이크로서비스 서버 (Fastify) |
| `ServiceBase<TAuthInfo>` | 서비스 기본 클래스 |

### 인증
| 클래스/데코레이터 | 용도 |
|-------------------|------|
| `JwtManager<TAuthInfo>` | JWT 토큰 관리 |
| `@Authorize(perms?)` | 권한 설정 데코레이터 |

### 설정
| 클래스 | 용도 |
|--------|------|
| `ConfigManager` | JSON 설정 로드/캐싱 (파일 감시) |

## storage

### 스토리지
| 클래스 | 용도 |
|--------|------|
| `StorageFactory` | FTP/FTPS/SFTP 연결 팩토리 |
| `FtpStorageClient` | FTP/FTPS 클라이언트 |
| `SftpStorageClient` | SFTP 클라이언트 |

### Storage 주요 메서드
| 메서드 | 용도 |
|--------|------|
| `connect(config)` | 연결 |
| `mkdir(path)` | 디렉토리 생성 |
| `readdir(path)` | 목록 조회 |
| `readFile(path)` | 파일 읽기 |
| `put(local, remote)` | 업로드 |
| `remove(path)` | 삭제 |
