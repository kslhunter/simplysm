# ECharts 래퍼 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ECharts를 SolidJS 컴포넌트로 감싸는 얇은 래퍼 구현 (option 반영 + ResizeObserver + cleanup)

**Architecture:** `echarts.init()`으로 SVG 렌더러 차트를 초기화하고, SolidJS의 `createEffect`로 option/loading 변경을 추적하며, `@solid-primitives/resize-observer`로 컨테이너 크기 변경에 반응한다. echarts는 peerDependencies로 제공한다.

**Tech Stack:** SolidJS, ECharts 6, @solid-primitives/resize-observer, Tailwind CSS, clsx, tailwind-merge

---

### Task 1: 의존성 추가

**Files:**

- Modify: `packages/solid/package.json` — peerDependencies 추가
- Modify: `packages/solid-demo/package.json` — dependencies 추가

**Step 1: `packages/solid/package.json`에 peerDependencies 추가**

`devDependencies` 뒤에 `peerDependencies` 블록을 추가한다:

```json
  "devDependencies": {
    "@solidjs/testing-library": "^0.8.10"
  },
  "peerDependencies": {
    "echarts": "^6.0.0"
  },
  "peerDependenciesMeta": {
    "echarts": {
      "optional": true
    }
  }
```

`optional: true`로 설정하여 echarts를 사용하지 않는 앱에서 경고가 뜨지 않게 한다.

**Step 2: `packages/solid-demo/package.json`에 dependencies 추가**

`dependencies`에 `"echarts": "^6.0.0"` 추가:

```json
  "dependencies": {
    "@simplysm/solid": "workspace:*",
    "@solidjs/router": "^0.15.4",
    "@tabler/icons-solidjs": "^3.31.0",
    "echarts": "^6.0.0",
    "solid-js": "^1.9.11"
  },
```

**Step 3: pnpm install 실행**

Run: `pnpm install`

**Step 4: 커밋**

```bash
git add packages/solid/package.json packages/solid-demo/package.json pnpm-lock.yaml
git commit -m "chore: echarts 의존성 추가 (peerDependencies)"
```

---

### Task 2: Echarts 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/display/Echarts.tsx`
- Modify: `packages/solid/src/index.ts` — export 추가

**Step 1: `Echarts.tsx` 생성**

참고 패턴: `Barcode.tsx` (외부 라이브러리 래퍼). 핵심 차이점: Barcode는 innerHTML로 SVG를 삽입하지만, Echarts는 `echarts.init()`이 DOM을 직접 관리한다.

```tsx
import { type Component, createEffect, onCleanup, splitProps, type JSX } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import * as echarts from "echarts";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface EchartsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  option: echarts.EChartsOption;
  loading?: boolean;
}

const baseClass = clsx("block", "w-full h-full");

export const Echarts: Component<EchartsProps> = (props) => {
  const [local, rest] = splitProps(props, ["option", "loading", "class"]);
  let containerRef!: HTMLDivElement;
  let chart: echarts.EChartsType;

  // 마운트 시 차트 초기화 + 언마운트 시 정리
  createEffect(() => {
    chart = echarts.init(containerRef, null, { renderer: "svg" });
    onCleanup(() => chart.dispose());
  });

  // option 변경 감지
  createEffect(() => {
    chart.setOption(local.option);
  });

  // loading 상태 변경 감지
  createEffect(() => {
    if (local.loading) {
      chart.showLoading();
    } else {
      chart.hideLoading();
    }
  });

  // 컨테이너 크기 변경 감지
  createResizeObserver(containerRef, () => {
    chart.resize();
  });

  return <div data-echarts ref={containerRef} class={twMerge(baseClass, local.class)} {...rest} />;
};
```

**Step 2: `index.ts`에 export 추가**

`packages/solid/src/index.ts`의 `// display` 섹션에 추가:

```typescript
// display
export * from "./components/display/Barcode";
export * from "./components/display/Card";
export * from "./components/display/Echarts";
export * from "./components/display/Icon";
export * from "./components/display/Label";
export * from "./components/display/Note";
```

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: 린트**

Run: `pnpm lint packages/solid/src/components/display/Echarts.tsx`
Expected: 에러 없음

**Step 5: 커밋**

```bash
git add packages/solid/src/components/display/Echarts.tsx packages/solid/src/index.ts
git commit -m "feat(solid): Echarts 래퍼 컴포넌트 구현"
```

---

### Task 3: 데모 페이지 구현

**Files:**

- Create: `packages/solid-demo/src/pages/display/EchartsPage.tsx`
- Modify: `packages/solid-demo/src/main.tsx` — 라우트 추가
- Modify: `packages/solid-demo/src/pages/Home.tsx` — 사이드바 메뉴 추가

**Step 1: `EchartsPage.tsx` 생성**

참고 패턴: `BarcodePage.tsx`. `Topbar.Container` → `Topbar` → 콘텐츠 구조를 따른다.

```tsx
import { createSignal } from "solid-js";
import { Button, Echarts, Topbar } from "@simplysm/solid";
import type { EChartsOption } from "echarts";

export default function EchartsPage() {
  const [loading, setLoading] = createSignal(false);

  const barOption: EChartsOption = {
    title: { text: "Bar Chart" },
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: [120, 200, 150, 80, 70] }],
  };

  const lineOption: EChartsOption = {
    title: { text: "Line Chart" },
    xAxis: { type: "category", data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
    yAxis: { type: "value" },
    series: [{ type: "line", data: [820, 932, 901, 934, 1290, 1330] }],
  };

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Echarts</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Bar Chart */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Bar Chart</h2>
            <div class="h-80">
              <Echarts option={barOption} loading={loading()} />
            </div>
          </section>

          {/* Line Chart */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Line Chart</h2>
            <div class="h-80">
              <Echarts option={lineOption} loading={loading()} />
            </div>
          </section>

          {/* Loading 토글 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Loading</h2>
            <Button onClick={() => setLoading((v) => !v)}>{loading() ? "로딩 해제" : "로딩 표시"}</Button>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
```

**Step 2: `main.tsx`에 라우트 추가**

기존 `/home/display/barcode` 라우트 아래에 추가:

```typescript
<Route path="/home/display/barcode" component={lazy(() => import("./pages/display/BarcodePage"))} />
<Route path="/home/display/echarts" component={lazy(() => import("./pages/display/EchartsPage"))} />
```

**Step 3: `Home.tsx`에 사이드바 메뉴 추가**

display 카테고리의 children 배열에 추가:

```typescript
{ title: "Barcode", href: "/home/display/barcode" },
{ title: "Echarts", href: "/home/display/echarts" },
```

**Step 4: 타입체크**

Run: `pnpm typecheck packages/solid-demo`
Expected: 에러 없음

**Step 5: 린트**

Run: `pnpm lint packages/solid-demo/src/pages/display/EchartsPage.tsx`
Expected: 에러 없음

**Step 6: 커밋**

```bash
git add packages/solid-demo/src/pages/display/EchartsPage.tsx packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): Echarts 데모 페이지 추가"
```

---

### Task 4: 데모 앱에서 시각 검증

**Step 1: dev 서버 실행**

Run: `pnpm dev`

**Step 2: 브라우저에서 확인**

- 데모 앱 접속 → 사이드바 Display > Echarts 클릭
- Bar Chart, Line Chart가 정상 렌더링되는지 확인
- Loading 버튼 클릭 시 로딩 인디케이터가 표시/해제되는지 확인
- 브라우저 크기 조절 시 차트가 리사이즈되는지 확인

---

### Task 5: 마이그레이션 문서 업데이트

**Files:**

- Modify: `docs/2026-02-09-solid-migration-remaining.md`

**Step 1: 10번 항목 상태 업데이트**

```markdown
| 10 | **ECharts 래퍼** | option 반영 + ResizeObserver + cleanup. 얇은 래퍼 | [x] |
```

**Step 2: 커밋**

```bash
git add docs/2026-02-09-solid-migration-remaining.md
git commit -m "docs: ECharts 래퍼 마이그레이션 완료 표시"
```
