import fs from "fs";
const BASE = "D:/workspaces-13/simplysm";
const fileEdits = {
  "packages/core-browser/src/extensions/element-ext.ts": [
    ["* 요소 bounds 정보 타입", "* Element bounds information type"],
    ["/** 측정 대상 요소 */", "/** Target element for measurement */"],
    ["/** 뷰포트 기준 상단 위치 */", "/** Top position relative to viewport */"],
    ["/** 뷰포트 기준 왼쪽 위치 */", "/** Left position relative to viewport */"],
    ["/** 요소 너비 */", "/** Element width */"],
    ["/** 요소 높이 */", "/** Element height */"],
    [
      "* 셀렉터로 하위 요소 전체 검색\n     *\n     * @param selector - CSS 셀렉터\n     * @returns 매칭된 요소 배열 (빈 셀렉터는 빈 배열 반환)",
      "* Search all descendant elements by selector\n     *\n     * @param selector - CSS selector\n     * @returns Array of matched elements (empty selector returns empty array)",
    ],
    [
      "* 셀렉터로 첫 번째 매칭 요소 검색\n     *\n     * @param selector - CSS 셀렉터\n     * @returns 첫 번째 매칭 요소 또는 undefined (빈 셀렉터는 undefined 반환)",
      "* Search first matching element by selector\n     *\n     * @param selector - CSS selector\n     * @returns First matched element or undefined (empty selector returns undefined)",
    ],
    [
      "* 요소를 첫 번째 자식으로 삽입\n     *\n     * @param child - 삽입할 자식 요소\n     * @returns 삽입된 자식 요소",
      "* Insert element as first child\n     *\n     * @param child - Child element to insert\n     * @returns Inserted child element",
    ],
    [
      "* 모든 부모 요소 목록 반환 (가까운 순서)\n     *\n     * @returns 부모 요소 배열 (가까운 부모부터 순서대로)",
      "* Return list of all parent elements (nearest first)\n     *\n     * @returns Array of parent elements (ordered from nearest parent)",
    ],
    [
      "* 부모 중 첫 번째 포커스 가능 요소 검색 (tabbable 사용)\n     *\n     * @returns 포커스 가능한 첫 번째 부모 요소 또는 undefined",
      "* Find first focusable parent element (using tabbable)\n     *\n     * @returns First focusable parent element or undefined",
    ],
    [
      "* 자식 중 첫 번째 포커스 가능 요소 검색 (tabbable 사용)\n     *\n     * @returns 포커스 가능한 첫 번째 자식 요소 또는 undefined",
      "* Find first focusable child element (using tabbable)\n     *\n     * @returns First focusable child element or undefined",
    ],
    [
      "* 요소가 offset 기준 요소인지 확인 (position: relative/absolute/fixed/sticky)\n     *\n     * @returns position 속성이 relative, absolute, fixed, sticky 중 하나면 true",
      "* Check if element is an offset reference element (position: relative/absolute/fixed/sticky)\n     *\n     * @returns true if position property is one of relative, absolute, fixed, sticky",
    ],
    [
      "* 요소가 화면에 보이는지 확인\n     *\n     * @remarks\n     * clientRects 존재 여부, visibility: hidden, opacity: 0 여부를 확인한다.\n     *\n     * @returns 요소가 화면에 보이면 true",
      "* Check if element is visible on screen\n     *\n     * @remarks\n     * Checks for existence of clientRects, visibility: hidden, and opacity: 0.\n     *\n     * @returns true if element is visible on screen",
    ],
    [
      "// 정적 함수 (이벤트 핸들러용 또는 여러 요소 대상)",
      "// Static functions (for event handlers or multiple elements)",
    ],
    [
      "* 요소 내용을 클립보드에 복사 (copy 이벤트 핸들러에서 사용)\n *\n * @param event - copy 이벤트 객체",
      "* Copy element content to clipboard (used in copy event handler)\n *\n * @param event - Copy event object",
    ],
    [
      "* 클립보드 내용을 요소에 붙여넣기 (paste 이벤트 핸들러에서 사용)\n *\n * @remarks\n * 대상 요소 내의 첫 번째 input/textarea를 찾아 전체 값을 클립보드 내용으로 교체한다.\n * 커서 위치나 선택 영역을 고려하지 않는다.\n *\n * @param event - paste 이벤트 객체",
      "* Paste clipboard content to element (used in paste event handler)\n *\n * @remarks\n * Finds the first input/textarea within the target element and replaces its entire value with clipboard content.\n * Does not consider cursor position or selection range.\n *\n * @param event - Paste event object",
    ],
    [
      "* IntersectionObserver를 사용하여 요소들의 bounds 정보 조회\n *\n * @param els - 대상 요소 배열\n * @param timeout - 타임아웃 (밀리초, 기본: 5000)\n * @throws {TimeoutError} 타임아웃 시간 내에 응답이 없을 경우",
      "* Get bounds information of elements using IntersectionObserver\n *\n * @param els - Array of target elements\n * @param timeout - Timeout (milliseconds, default: 5000)\n * @throws {TimeoutError} When no response within timeout duration",
    ],
    [
      "// 중복 제거 및 입력 순서대로 결과를 정렬하기 위한 인덱스 맵",
      "// Index map for deduplication and sorting results in input order",
    ],
    ["// 정렬 성능 최적화를 위한 인덱스 맵", "// Index map for sort performance optimization"],
    ["// 입력 순서대로 정렬", "// Sort in input order"],
  ],
  "packages/core-browser/src/extensions/html-element-ext.ts": [
    ["* 강제 리페인트 (reflow 트리거)", "* Force repaint (trigger reflow)"],
    [
      '* 부모 요소 기준 상대 위치 계산 (CSS 포지셔닝용)\n     *\n     * @remarks\n     * 이 함수는 요소의 위치를 부모 요소 기준으로 계산하되, `window.scrollX/Y`를 포함하여\n     * CSS `top`/`left` 속성에 직접 사용할 수 있는 문서 기준 좌표를 반환한다.\n     *\n     * 주요 사용 사례:\n     * - 드롭다운, 팝업 등을 `document.body`에 append 후 위치 지정\n     * - 스크롤된 페이지에서도 올바르게 동작\n     *\n     * 계산에 포함되는 요소:\n     * - 뷰포트 기준 위치 (getBoundingClientRect)\n     * - 문서 스크롤 위치 (window.scrollX/Y)\n     * - 부모 요소 내부 스크롤 (parentEl.scrollTop/Left)\n     * - 중간 요소들의 border 두께\n     * - CSS transform 변환\n     *\n     * @param parent - 기준이 될 부모 요소 또는 셀렉터 (예: document.body, ".container")\n     * @returns CSS top/left 속성에 사용할 수 있는 좌표\n     * @throws {ArgumentError} 부모 요소를 찾을 수 없는 경우',
      '* Calculate relative position to parent element (for CSS positioning)\n     *\n     * @remarks\n     * This function calculates the position of an element relative to a parent element,\n     * including `window.scrollX/Y` to return document-relative coordinates usable directly\n     * in CSS `top`/`left` properties.\n     *\n     * Primary use cases:\n     * - Positioning dropdowns, popups, etc. after appending to `document.body`\n     * - Works correctly on scrolled pages\n     *\n     * Factors included in calculation:\n     * - Viewport-relative position (getBoundingClientRect)\n     * - Document scroll position (window.scrollX/Y)\n     * - Parent element internal scroll (parentEl.scrollTop/Left)\n     * - Border widths of intermediate elements\n     * - CSS transform conversions\n     *\n     * @param parent - Parent element or selector to use as reference (e.g. document.body, ".container")\n     * @returns Coordinates usable in CSS top/left properties\n     * @throws {ArgumentError} When parent element cannot be found',
    ],
    [
      "* 대상이 offset 영역(고정 헤더/고정 열 등)에 가려진 경우, 보이도록 스크롤\n     *\n     * @remarks\n     * 이 함수는 대상이 스크롤 영역의 위쪽/왼쪽 경계를 벗어난 경우만 처리한다.\n     * 아래쪽/오른쪽으로 스크롤이 필요한 경우는 브라우저의 기본 포커스 스크롤 동작에 의존한다.\n     * 주로 고정 헤더나 고정 열이 있는 테이블에서 포커스 이벤트와 함께 사용된다.\n     *\n     * @param target - 대상의 컨테이너 내 위치 (offsetTop, offsetLeft)\n     * @param offset - 가려지면 안 되는 영역 크기 (예: 고정 헤더 높이, 고정 열 너비)",
      "* Scroll to make target visible when obscured by offset areas (fixed headers/fixed columns, etc.)\n     *\n     * @remarks\n     * This function only handles cases where the target exceeds the top/left boundaries of the scroll area.\n     * For cases requiring downward/rightward scrolling, it relies on the browser's default focus scroll behavior.\n     * Primarily used with focus events in tables with fixed headers or fixed columns.\n     *\n     * @param target - Position of target within container (offsetTop, offsetLeft)\n     * @param offset - Size of area that must not be obscured (e.g. fixed header height, fixed column width)",
    ],
    [
      "// offsetHeight 접근 시 브라우저는 동기적 레이아웃 계산(forced synchronous layout)을 수행하며,\n  // 이로 인해 현재 배치된 스타일 변경사항이 즉시 적용되어 리페인트가 트리거된다.",
      "// Accessing offsetHeight forces the browser to perform a synchronous layout calculation (forced synchronous layout),\n  // which immediately applies any pending style changes and triggers a repaint.",
    ],
  ],
  "packages/core-browser/src/index.ts": [
    ["// core-browser: 브라우저 전용 유틸리티", "// core-browser: Browser-only utilities"],
    ["// extensions (side-effect)", "// extensions (side-effect)"],
    ["// re-exports", "// re-exports"],
  ],
  "packages/core-browser/src/utils/download.ts": [
    [
      "* Blob을 파일로 다운로드\n *\n * @param blob - 다운로드할 Blob 객체\n * @param fileName - 저장될 파일 이름",
      "* Download Blob as file\n *\n * @param blob - Blob object to download\n * @param fileName - File name to save as",
    ],
  ],
  "packages/core-browser/src/utils/fetch.ts": [
    [
      "* URL에서 바이너리 데이터 다운로드 (진행률 콜백 지원)",
      "* Download binary data from URL (with progress callback support)",
    ],
    [
      "// Content-Length를 알 수 있으면 미리 할당하여 메모리 효율성 향상",
      "// Pre-allocate if Content-Length is known for memory efficiency",
    ],
    [
      "// Content-Length를 모르면 청크 수집 후 병합 (chunked encoding)",
      "// Collect and merge chunks if Content-Length is unknown (chunked encoding)",
    ],
    ["// 청크 병합", "// Merge chunks"],
  ],
  "packages/core-browser/src/utils/file-dialog.ts": [
    [
      "* 파일 선택 다이얼로그를 프로그래밍 방식으로 열기",
      "* Programmatically open file selection dialog",
    ],
  ],
  "packages/core-node/src/features/fs-watcher.ts": [
    ["/** glob 메타문자 패턴 */", "/** Glob metacharacter pattern */"],
    ["* glob 패턴에서 base 디렉토리 추출.", "* Extract base directory from glob pattern."],
    ["* 지원하는 파일 변경 이벤트 타입 목록.", "* List of supported file change event types."],
    ["* 파일 변경 이벤트 타입.", "* File change event type."],
    ["* 파일 변경 정보.", "* File change information."],
    ["/** 변경 이벤트 타입 */", "/** Change event type */"],
    [
      "/** 변경된 파일/디렉토리 경로 (정규화됨) */",
      "/** Changed file/directory path (normalized) */",
    ],
    [
      "* chokidar 기반 파일 시스템 감시 래퍼.\n * 짧은 시간 내 발생한 이벤트를 병합하여 콜백 호출.",
      "* chokidar-based file system watcher wrapper.\n * Merges events that occur within a short time and invokes callback.",
    ],
    [
      "* **주의**: chokidar의 `ignoreInitial` 옵션은 내부적으로 항상 `true`로 설정된다.\n * `options.ignoreInitial: false`를 전달하면 `onChange` 첫 호출 시 빈 배열로\n * 콜백이 호출되지만, 실제 초기 파일 목록은 포함되지 않는다.\n * 이는 이벤트 병합 로직과의 충돌을 방지하기 위한 의도된 동작이다.",
      "* **Note**: The chokidar `ignoreInitial` option is always set to `true` internally.\n * Passing `options.ignoreInitial: false` will cause the `onChange` first call to invoke\n * the callback with an empty array, but actual initial file list is not included.\n * This is intentional behavior to prevent conflicts with event merging logic.",
    ],
    ["// 종료", "// Terminate"],
    [
      "* 파일 감시 시작 (비동기).\n   * ready 이벤트가 발생할 때까지 대기.\n   *\n   * @param paths - 감시할 파일/디렉토리 경로 또는 glob 패턴 배열\n   * @param options - chokidar 옵션",
      "* Start file watching (async).\n   * Waits until the ready event is emitted.\n   *\n   * @param paths - Array of file/directory paths or glob patterns to watch\n   * @param options - chokidar options",
    ],
    ["// 중복 경로 제거", "// Remove duplicate paths"],
    ["// 감시 중 발생하는 에러 로깅", "// Log errors during watching"],
    [
      "* 파일 변경 이벤트 핸들러 등록.\n   * 지정된 delay 시간 동안 이벤트를 모아서 한 번에 콜백 호출.\n   *\n   * @param opt.delay - 이벤트 병합 대기 시간 (ms)\n   * @param cb - 변경 이벤트 콜백",
      "* Register file change event handler.\n   * Collects events during the specified delay and invokes callback at once.\n   *\n   * @param opt.delay - Event merge wait time (ms)\n   * @param cb - Change event callback",
    ],
    [
      "// ignoreInitial이 false면 초기에 빈 배열로 콜백 호출",
      "// Call callback with empty array initially if ignoreInitial is false",
    ],
    ["// 지원하는 이벤트만 처리", "// Process only supported events"],
    ["// glob 매처가 있으면 패턴 필터링 적용", "// Apply pattern filtering if glob matchers exist"],
    [
      "* 이벤트 병합 전략:\n       * 짧은 시간 내 같은 파일에 대해 여러 이벤트가 발생하면 최종 상태만 전달한다.\n       * - add + change → add (생성 직후 수정은 생성으로 간주)\n       * - add + unlink → 삭제 (생성 후 즉시 삭제는 변경 없음)\n       * - unlink + add → add (삭제 후 재생성은 생성으로 간주)\n       * - 그 외 → 최신 이벤트로 덮어씀",
      "* Event merge strategy:\n       * When multiple events occur for the same file within a short time, only the final state is delivered.\n       * - add + change -> add (modification right after creation is treated as creation)\n       * - add + unlink -> deletion (creation then immediate deletion means no change)\n       * - unlink + add -> add (deletion then recreation is treated as creation)\n       * - Otherwise -> overwrite with latest event",
    ],
    ["// add 후 change → add 유지", "// add then change -> keep add"],
    ["// add 후 unlink → 변경 없음 (삭제)", "// add then unlink -> no change (deleted)"],
    [
      "// unlink 후 add/change → add (파일 재생성)",
      "// unlink then add/change -> add (file recreated)",
    ],
    [
      "// unlinkDir 후 addDir → addDir (디렉토리 재생성)",
      "// unlinkDir then addDir -> addDir (directory recreated)",
    ],
    ["* 파일 감시 종료.", "* Close file watcher."],
  ],
  "packages/core-node/src/utils/fs.ts": [
    ["//#region 존재 확인", "//#region Existence check"],
    [
      "* 파일 또는 디렉토리 존재 확인 (동기).\n * @param targetPath - 확인할 경로",
      "* Check if file or directory exists (sync).\n * @param targetPath - Path to check",
    ],
    [
      "* 파일 또는 디렉토리 존재 확인 (비동기).\n * @param targetPath - 확인할 경로",
      "* Check if file or directory exists (async).\n * @param targetPath - Path to check",
    ],
    ["//#region 디렉토리 생성", "//#region Directory creation"],
    [
      "* 디렉토리 생성 (recursive).\n * @param targetPath - 생성할 디렉토리 경로",
      "* Create directory (recursive).\n * @param targetPath - Directory path to create",
    ],
    [
      "* 디렉토리 생성 (recursive, 비동기).\n * @param targetPath - 생성할 디렉토리 경로",
      "* Create directory (recursive, async).\n * @param targetPath - Directory path to create",
    ],
    ["//#region 삭제", "//#region Deletion"],
    [
      "* 파일 또는 디렉토리 삭제.\n * @param targetPath - 삭제할 경로\n * @remarks 동기 버전은 재시도 없이 즉시 실패함. 파일 잠금 등 일시적 오류 가능성이 있는 경우 fsRm 사용을 권장함.",
      "* Delete file or directory.\n * @param targetPath - Path to delete\n * @remarks Sync version fails immediately without retry. For potential transient errors like file locks, using fsRm is recommended.",
    ],
    [
      "* 파일 또는 디렉토리 삭제 (비동기).\n * @param targetPath - 삭제할 경로\n * @remarks 비동기 버전은 파일 잠금 등의 일시적 오류에 대해 최대 6회(500ms 간격) 재시도함.",
      "* Delete file or directory (async).\n * @param targetPath - Path to delete\n * @remarks Async version retries up to 6 times (500ms interval) for transient errors like file locks.",
    ],
    ["//#region 복사", "//#region Copy"],
    [
      "* 파일 또는 디렉토리 복사.\n *\n * sourcePath가 존재하지 않으면 아무 작업도 수행하지 않고 반환한다.\n *\n * @param sourcePath 복사할 원본 경로\n * @param targetPath 복사 대상 경로\n * @param filter 복사 여부를 결정하는 필터 함수.\n *               각 파일/디렉토리의 **절대 경로**가 전달되며,\n *               true를 반환하면 복사, false면 제외.\n *               **주의**: 최상위 sourcePath는 필터 대상이 아니며,\n *               모든 하위 항목(자식, 손자 등)에 재귀적으로 filter 함수가 적용된다.\n *               디렉토리에 false를 반환하면 해당 디렉토리와 모든 하위 항목이 건너뛰어짐.",
      "* Copy file or directory.\n *\n * Returns without action if sourcePath does not exist.\n *\n * @param sourcePath Source path to copy\n * @param targetPath Destination path\n * @param filter Filter function to determine whether to copy.\n *               Receives the **absolute path** of each file/directory,\n *               returns true to copy, false to exclude.\n *               **Note**: The top-level sourcePath is not subject to filtering.\n *               The filter function is applied recursively to all descendants (children, grandchildren, etc.).\n *               Returning false for a directory skips that directory and all its descendants.",
    ],
    [
      "* 파일 또는 디렉토리 복사 (비동기).\n *\n * sourcePath가 존재하지 않으면 아무 작업도 수행하지 않고 반환한다.\n *\n * @param sourcePath 복사할 원본 경로\n * @param targetPath 복사 대상 경로\n * @param filter 복사 여부를 결정하는 필터 함수.\n *               각 파일/디렉토리의 **절대 경로**가 전달되며,\n *               true를 반환하면 복사, false면 제외.\n *               **주의**: 최상위 sourcePath는 필터 대상이 아니며,\n *               모든 하위 항목(자식, 손자 등)에 재귀적으로 filter 함수가 적용된다.\n *               디렉토리에 false를 반환하면 해당 디렉토리와 모든 하위 항목이 건너뛰어짐.",
      "* Copy file or directory (async).\n *\n * Returns without action if sourcePath does not exist.\n *\n * @param sourcePath Source path to copy\n * @param targetPath Destination path\n * @param filter Filter function to determine whether to copy.\n *               Receives the **absolute path** of each file/directory,\n *               returns true to copy, false to exclude.\n *               **Note**: The top-level sourcePath is not subject to filtering.\n *               The filter function is applied recursively to all descendants (children, grandchildren, etc.).\n *               Returning false for a directory skips that directory and all its descendants.",
    ],
    ["//#region 파일 읽기", "//#region File read"],
    [
      "* 파일 읽기 (UTF-8 문자열).\n * @param targetPath - 읽을 파일 경로",
      "* Read file (UTF-8 string).\n * @param targetPath - File path to read",
    ],
    [
      "* 파일 읽기 (UTF-8 문자열, 비동기).\n * @param targetPath - 읽을 파일 경로",
      "* Read file (UTF-8 string, async).\n * @param targetPath - File path to read",
    ],
    [
      "* 파일 읽기 (Buffer).\n * @param targetPath - 읽을 파일 경로",
      "* Read file (Buffer).\n * @param targetPath - File path to read",
    ],
    [
      "* 파일 읽기 (Buffer, 비동기).\n * @param targetPath - 읽을 파일 경로",
      "* Read file (Buffer, async).\n * @param targetPath - File path to read",
    ],
    [
      "* JSON 파일 읽기 (JsonConvert 사용).\n * @param targetPath - 읽을 JSON 파일 경로",
      "* Read JSON file (using JsonConvert).\n * @param targetPath - JSON file path to read",
    ],
    [
      "* JSON 파일 읽기 (JsonConvert 사용, 비동기).\n * @param targetPath - 읽을 JSON 파일 경로",
      "* Read JSON file (using JsonConvert, async).\n * @param targetPath - JSON file path to read",
    ],
    ["//#region 파일 쓰기", "//#region File write"],
    [
      "* 파일 쓰기 (부모 디렉토리 자동 생성).\n * @param targetPath - 쓸 파일 경로\n * @param data - 쓸 데이터 (문자열 또는 바이너리)",
      "* Write file (auto-creates parent directory).\n * @param targetPath - File path to write\n * @param data - Data to write (string or binary)",
    ],
    [
      "* 파일 쓰기 (부모 디렉토리 자동 생성, 비동기).\n * @param targetPath - 쓸 파일 경로\n * @param data - 쓸 데이터 (문자열 또는 바이너리)",
      "* Write file (auto-creates parent directory, async).\n * @param targetPath - File path to write\n * @param data - Data to write (string or binary)",
    ],
    [
      "* JSON 파일 쓰기 (JsonConvert 사용).\n * @param targetPath - 쓸 JSON 파일 경로\n * @param data - 쓸 데이터\n * @param options - JSON 직렬화 옵션",
      "* Write JSON file (using JsonConvert).\n * @param targetPath - JSON file path to write\n * @param data - Data to write\n * @param options - JSON serialization options",
    ],
    [
      "* JSON 파일 쓰기 (JsonConvert 사용, 비동기).\n * @param targetPath - 쓸 JSON 파일 경로\n * @param data - 쓸 데이터\n * @param options - JSON 직렬화 옵션",
      "* Write JSON file (using JsonConvert, async).\n * @param targetPath - JSON file path to write\n * @param data - Data to write\n * @param options - JSON serialization options",
    ],
    ["//#region 디렉토리 읽기", "//#region Directory read"],
    [
      "* 디렉토리 내용 읽기.\n * @param targetPath - 읽을 디렉토리 경로",
      "* Read directory contents.\n * @param targetPath - Directory path to read",
    ],
    [
      "* 디렉토리 내용 읽기 (비동기).\n * @param targetPath - 읽을 디렉토리 경로",
      "* Read directory contents (async).\n * @param targetPath - Directory path to read",
    ],
    ["//#region 파일 정보", "//#region File info"],
    [
      "* 파일/디렉토리 정보 (심볼릭 링크 따라감).\n * @param targetPath - 정보를 조회할 경로",
      "* File/directory info (follows symbolic links).\n * @param targetPath - Path to query info",
    ],
    [
      "* 파일/디렉토리 정보 (심볼릭 링크 따라감, 비동기).\n * @param targetPath - 정보를 조회할 경로",
      "* File/directory info (follows symbolic links, async).\n * @param targetPath - Path to query info",
    ],
    [
      "* 파일/디렉토리 정보 (심볼릭 링크 따라가지 않음).\n * @param targetPath - 정보를 조회할 경로",
      "* File/directory info (does not follow symbolic links).\n * @param targetPath - Path to query info",
    ],
    [
      "* 파일/디렉토리 정보 (심볼릭 링크 따라가지 않음, 비동기).\n * @param targetPath - 정보를 조회할 경로",
      "* File/directory info (does not follow symbolic links, async).\n * @param targetPath - Path to query info",
    ],
    ["//#region 글로브", "//#region Glob"],
    [
      '* 글로브 패턴으로 파일 검색.\n * @param pattern - 글로브 패턴 (예: "**\\/*.ts")\n * @param options - glob 옵션\n * @returns 매칭된 파일들의 절대 경로 배열',
      '* Search files by glob pattern.\n * @param pattern - Glob pattern (e.g. "**\\/*.ts")\n * @param options - glob options\n * @returns Array of absolute paths of matched files',
    ],
    [
      '* 글로브 패턴으로 파일 검색 (비동기).\n * @param pattern - 글로브 패턴 (예: "**\\/*.ts")\n * @param options - glob 옵션\n * @returns 매칭된 파일들의 절대 경로 배열',
      '* Search files by glob pattern (async).\n * @param pattern - Glob pattern (e.g. "**\\/*.ts")\n * @param options - glob options\n * @returns Array of absolute paths of matched files',
    ],
    ["//#region 유틸리티", "//#region Utilities"],
    [
      "* 지정 디렉토리 하위의 빈 디렉토리를 재귀적으로 탐색하여 삭제.\n * 하위 디렉토리가 모두 삭제되어 빈 디렉토리가 된 경우, 해당 디렉토리도 삭제 대상이 됨.",
      "* Recursively find and delete empty directories under the specified directory.\n * If all subdirectories are deleted making the directory empty, that directory also becomes a deletion target.",
    ],
    ["// 파일이 있었다면 삭제 불가", "// Cannot delete if files existed"],
    [
      "// 파일이 없었던 경우에만 재확인 (하위 디렉토리가 삭제되었을 수 있음)",
      "// Re-check only if no files existed (subdirectories may have been deleted)",
    ],
    [
      "* 시작 경로부터 루트 방향으로 상위 디렉토리를 순회하며 glob 패턴 검색.\n * 각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집.\n * @param childGlob - 각 디렉토리에서 검색할 glob 패턴\n * @param fromPath - 검색 시작 경로\n * @param rootPath - 검색 종료 경로 (미지정 시 파일시스템 루트까지).\n *                   **주의**: fromPath가 rootPath의 자식 경로여야 함.\n *                   그렇지 않으면 파일시스템 루트까지 검색함.",
      "* Traverse parent directories from start path toward root, searching with glob pattern.\n * Collects all file paths matching the childGlob pattern in each directory.\n * @param childGlob - Glob pattern to search in each directory\n * @param fromPath - Search start path\n * @param rootPath - Search end path (searches to filesystem root if unspecified).\n *                   **Note**: fromPath must be a child path of rootPath.\n *                   Otherwise searches up to the filesystem root.",
    ],
    [
      "* 시작 경로부터 루트 방향으로 상위 디렉토리를 순회하며 glob 패턴 검색 (비동기).\n * 각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집.\n * @param childGlob - 각 디렉토리에서 검색할 glob 패턴\n * @param fromPath - 검색 시작 경로\n * @param rootPath - 검색 종료 경로 (미지정 시 파일시스템 루트까지).\n *                   **주의**: fromPath가 rootPath의 자식 경로여야 함.\n *                   그렇지 않으면 파일시스템 루트까지 검색함.",
      "* Traverse parent directories from start path toward root, searching with glob pattern (async).\n * Collects all file paths matching the childGlob pattern in each directory.\n * @param childGlob - Glob pattern to search in each directory\n * @param fromPath - Search start path\n * @param rootPath - Search end path (searches to filesystem root if unspecified).\n *                   **Note**: fromPath must be a child path of rootPath.\n *                   Otherwise searches up to the filesystem root.",
    ],
  ],
  "packages/core-node/src/utils/path.ts": [
    [
      "* 정규화된 경로를 나타내는 브랜드 타입.\n * pathNorm()을 통해서만 생성 가능.",
      "* Brand type representing a normalized path.\n * Can only be created via pathNorm().",
    ],
    ["//#region 함수", "//#region Functions"],
    [
      "* POSIX 스타일 경로로 변환 (백슬래시 → 슬래시).",
      "* Convert to POSIX-style path (backslash -> forward slash).",
    ],
    ["* 파일 경로의 디렉토리를 변경.", "* Change the directory of a file path."],
    [
      "* @throws 파일이 fromDirectory 안에 없으면 에러",
      "* @throws Error if file is not inside fromDirectory",
    ],
    [
      "* 확장자를 제거한 파일명(basename)을 반환.",
      "* Return filename (basename) without extension.",
    ],
    [
      "* childPath가 parentPath의 자식 경로인지 확인.\n * 같은 경로는 false 반환.\n *\n * 경로는 내부적으로 `pathNorm()`으로 정규화된 후 비교되며,\n * 플랫폼별 경로 구분자(Windows: `\\`, Unix: `/`)를 사용한다.",
      "* Check if childPath is a child path of parentPath.\n * Returns false for the same path.\n *\n * Paths are internally normalized via `pathNorm()` before comparison,\n * using platform-specific path separators (Windows: `\\`, Unix: `/`).",
    ],
    ["// 같은 경로면 false", "// false for same path"],
    ["// 부모 경로 + 구분자로 시작하는지 확인", "// Check if starts with parent path + separator"],
    [
      "* 경로를 정규화하여 NormPath로 반환.\n * 절대 경로로 변환되며, 플랫폼별 구분자로 정규화됨.",
      "* Normalize path and return as NormPath.\n * Converts to absolute path, normalized with platform-specific separators.",
    ],
    [
      "* 타겟 경로 목록을 기준으로 파일을 필터링.\n * 파일이 타겟 경로와 같거나 타겟의 자식 경로일 때 포함.\n *\n * @param files - 필터링할 파일 경로 목록.\n *                **주의**: cwd 하위의 절대 경로여야 함.\n *                cwd 외부 경로는 상대 경로(../ 형태)로 변환되어 처리됨.\n * @param targets - 타겟 경로 목록 (cwd 기준 상대 경로, POSIX 스타일 권장)\n * @param cwd - 현재 작업 디렉토리 (절대 경로)\n * @returns targets가 빈 배열이면 files 그대로, 아니면 타겟 경로 하위 파일만",
      "* Filter files based on target path list.\n * Includes files that match or are children of target paths.\n *\n * @param files - List of file paths to filter.\n *                **Note**: Must be absolute paths under cwd.\n *                Paths outside cwd are converted to relative paths (../ format).\n * @param targets - List of target paths (relative to cwd, POSIX style recommended)\n * @param cwd - Current working directory (absolute path)\n * @returns files as-is if targets is empty, otherwise only files under target paths",
    ],
  ],
  "packages/core-node/src/worker/create-worker.ts": [
    [
      '* 워커 스레드에서 사용할 워커 팩토리.\n *\n * @example\n * // 이벤트 없는 워커\n * export default createWorker({\n *   add: (a: number, b: number) => a + b,\n * });\n *\n * // 이벤트 있는 워커\n * interface MyEvents { progress: number; }\n * const methods = {\n *   calc: (x: number) => { sender.send("progress", 50); return x * 2; },\n * };\n * const sender = createWorker<typeof methods, MyEvents>(methods);\n * export default sender;',
      '* Worker factory for use in worker threads.\n *\n * @example\n * // Worker without events\n * export default createWorker({\n *   add: (a: number, b: number) => a + b,\n * });\n *\n * // Worker with events\n * interface MyEvents { progress: number; }\n * const methods = {\n *   calc: (x: number) => { sender.send("progress", 50); return x * 2; },\n * };\n * const sender = createWorker<typeof methods, MyEvents>(methods);\n * export default sender;',
    ],
    [
      "// Worker 스레드의 stdout은 메인 스레드로 자동 전달되지 않음\n  // stdout.write를 가로채서 메시지 프로토콜을 통해 메인 스레드로 전달",
      "// Worker thread stdout is not automatically forwarded to main thread\n  // Intercept stdout.write and forward to main thread via message protocol",
    ],
    ["// 요청 구조 검증", "// Request structure validation"],
  ],
  "packages/core-node/src/worker/types.ts": [
    [
      '* `createWorker()`가 반환하는 워커 모듈의 타입 구조.\n * `Worker.create<typeof import("./worker")>()`에서 타입 추론에 사용된다.\n *\n * @see createWorker - 워커 모듈 생성\n * @see Worker.create - 워커 프록시 생성',
      '* Type structure of the worker module returned by `createWorker()`.\n * Used for type inference in `Worker.create<typeof import("./worker")>()`.\n *\n * @see createWorker - Worker module creation\n * @see Worker.create - Worker proxy creation',
    ],
    [
      "* 메서드 타입의 반환값을 Promise로 래핑하는 매핑 타입.\n * 워커 메서드는 postMessage 기반으로 동작하여 항상 비동기이므로,\n * 동기 메서드 타입도 `Promise<Awaited<R>>`로 변환한다.",
      "* Mapping type that wraps method return types in Promise.\n * Since worker methods operate via postMessage and are always async,\n * even sync method types are converted to `Promise<Awaited<R>>`.",
    ],
    [
      "* SdWorker.create()가 반환하는 Proxy 타입.\n * Promisified 메서드들 + on() + terminate() 제공.",
      "* Proxy type returned by SdWorker.create().\n * Provides promisified methods + on() + terminate().",
    ],
    ["* 워커 이벤트 리스너 등록.", "* Register worker event listener."],
    ["* 워커 이벤트 리스너 제거.", "* Remove worker event listener."],
    ["* 워커 종료.", "* Terminate worker."],
    ["* Worker 내부 요청 메시지.", "* Worker internal request message."],
    ["* Worker 내부 응답 메시지.", "* Worker internal response message."],
  ],
  "packages/core-node/src/worker/worker.ts": [
    [
      "* Worker 내부 구현 클래스.\n * Proxy를 통해 외부에 노출됨.\n *\n * 개발 환경(.ts)에서는 tsx를 통해 TypeScript 워커 파일을 실행하고,\n * 프로덕션 환경(.js)에서는 직접 Worker를 생성한다.",
      "* Worker internal implementation class.\n * Exposed externally via Proxy.\n *\n * In development environment (.ts), runs TypeScript worker files through tsx,\n * in production environment (.js), creates Worker directly.",
    ],
    ["// 타입 가드를 통한 env 객체 추출", "// Extract env object via type guard"],
    [
      "// 개발 환경 (.ts 파일)인 경우 tsx를 통해 실행\n    // worker-dev-proxy.js: tsx로 TypeScript 워커 파일을 동적으로 로드하는 프록시",
      "// Run via tsx for development environment (.ts files)\n    // worker-dev-proxy.js: proxy that dynamically loads TypeScript worker files via tsx",
    ],
    [
      "// file:// URL인 경우 절대 경로로 변환 (worker-dev-proxy.js에서 다시 pathToFileURL 적용)",
      "// Convert file:// URL to absolute path (worker-dev-proxy.js will re-apply pathToFileURL)",
    ],
    [
      "// 프로덕션 환경 (.js 파일)\n      // file:// URL인 경우 변환, 이미 절대 경로인 경우 그대로 사용",
      "// Production environment (.js files)\n      // Convert if file:// URL, use as-is if already absolute path",
    ],
    ["// 워커의 stdout/stderr를 메인에 출력", "// Pipe worker stdout/stderr to main"],
    [
      "// 비정상 종료 시 대기 중인 모든 요청 reject",
      "// Reject all pending requests on abnormal exit",
    ],
    [
      "// 워커 에러 시 대기 중인 모든 요청 reject",
      "// Reject all pending requests on worker error",
    ],
    ["// 응답 구조 검증", "// Response structure validation"],
    ["* 대기 중인 모든 요청을 reject합니다.", "* Rejects all pending requests."],
    ["* 워커 메서드 호출.", "* Call worker method."],
    ["* 워커 종료.", "* Terminate worker."],
    ["* 타입 안전한 Worker 래퍼.", "* Type-safe Worker wrapper."],
    [
      "* 타입 안전한 Worker Proxy 생성.\n   *\n   * @param filePath - 워커 파일 경로 (file:// URL 또는 절대 경로)\n   * @param opt - Worker 옵션\n   * @returns Proxy 객체 (메서드 직접 호출, on(), terminate() 지원)",
      "* Create type-safe Worker Proxy.\n   *\n   * @param filePath - Worker file path (file:// URL or absolute path)\n   * @param opt - Worker options\n   * @returns Proxy object (direct method calls, on(), terminate() supported)",
    ],
    ["// 예약된 메서드: on, off, terminate", "// Reserved methods: on, off, terminate"],
    ["// 그 외는 워커 메서드로 처리", "// Everything else is handled as worker method"],
  ],
};
let totalFiles = 0;
let totalReplacements = 0;
for (const [rel, edits] of Object.entries(fileEdits)) {
  const filePath = BASE + "/" + rel;
  let content = fs.readFileSync(filePath, "utf-8");
  let count = 0;
  for (const [old, rep] of edits) {
    if (content.includes(old)) {
      content = content.replace(old, rep);
      count++;
    }
  }
  if (count > 0) {
    fs.writeFileSync(filePath, content, "utf-8");
    totalFiles++;
    totalReplacements += count;
    console.log(`Updated: ${rel} (${count} replacements)`);
  } else {
    console.log(`SKIPPED: ${rel} (no matches)`);
  }
}
console.log(`\nTotal: ${totalFiles} files, ${totalReplacements} replacements`);
