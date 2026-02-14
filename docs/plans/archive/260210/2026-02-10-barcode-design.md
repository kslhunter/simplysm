# Barcode 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `bwip-js`를 사용하여 1D/2D 바코드를 SVG로 렌더링하는 SolidJS Barcode 컴포넌트를 구현한다.

**Architecture:** 기존 Angular `sd-barcode` 컴포넌트를 SolidJS로 포팅한다. `bwip-js/browser`의 `toSVG()`로 SVG를 생성하고 `createEffect`로 반응성을 처리한다. display 카테고리(Card, Note 등)와 동일한 패턴을 따른다.

**Tech Stack:** SolidJS, bwip-js, clsx, tailwind-merge, Vitest + @solidjs/testing-library

---

### Task 1: bwip-js 의존성 추가

**Files:**

- Modify: `packages/solid/package.json`

**Step 1: bwip-js 설치**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
pnpm add bwip-js --filter @simplysm/solid
```

**Step 2: 설치 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
cat packages/solid/package.json | grep bwip-js
```

Expected: `"bwip-js": "^4.x.x"` 라인이 dependencies에 존재

**Step 3: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
git add packages/solid/package.json pnpm-lock.yaml
git commit -m "chore(solid): bwip-js 의존성 추가"
```

---

### Task 2: Barcode 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/display/Barcode.tsx`
- Modify: `packages/solid/src/index.ts`

**Step 1: Barcode.tsx 작성**

`packages/solid/src/components/display/Barcode.tsx` 파일을 생성한다.

```tsx
import { type Component, createEffect, splitProps, type JSX } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import bwipjs from "bwip-js/browser";

export type BarcodeType =
  | "auspost"
  | "azteccode"
  | "azteccodecompact"
  | "aztecrune"
  | "bc412"
  | "channelcode"
  | "codablockf"
  | "code11"
  | "code128"
  | "code16k"
  | "code2of5"
  | "code32"
  | "code39"
  | "code39ext"
  | "code49"
  | "code93"
  | "code93ext"
  | "codeone"
  | "coop2of5"
  | "daft"
  | "databarexpanded"
  | "databarexpandedcomposite"
  | "databarexpandedstacked"
  | "databarexpandedstackedcomposite"
  | "databarlimited"
  | "databarlimitedcomposite"
  | "databaromni"
  | "databaromnicomposite"
  | "databarstacked"
  | "databarstackedcomposite"
  | "databarstackedomni"
  | "databarstackedomnicomposite"
  | "databartruncated"
  | "databartruncatedcomposite"
  | "datalogic2of5"
  | "datamatrix"
  | "datamatrixrectangular"
  | "datamatrixrectangularextension"
  | "dotcode"
  | "ean13"
  | "ean13composite"
  | "ean14"
  | "ean2"
  | "ean5"
  | "ean8"
  | "ean8composite"
  | "flattermarken"
  | "gs1-128"
  | "gs1-128composite"
  | "gs1-cc"
  | "gs1datamatrix"
  | "gs1datamatrixrectangular"
  | "gs1dldatamatrix"
  | "gs1dlqrcode"
  | "gs1dotcode"
  | "gs1northamericancoupon"
  | "gs1qrcode"
  | "hanxin"
  | "hibcazteccode"
  | "hibccodablockf"
  | "hibccode128"
  | "hibccode39"
  | "hibcdatamatrix"
  | "hibcdatamatrixrectangular"
  | "hibcmicropdf417"
  | "hibcpdf417"
  | "hibcqrcode"
  | "iata2of5"
  | "identcode"
  | "industrial2of5"
  | "interleaved2of5"
  | "isbn"
  | "ismn"
  | "issn"
  | "itf14"
  | "japanpost"
  | "kix"
  | "leitcode"
  | "mailmark"
  | "mands"
  | "matrix2of5"
  | "maxicode"
  | "micropdf417"
  | "microqrcode"
  | "msi"
  | "onecode"
  | "pdf417"
  | "pdf417compact"
  | "pharmacode"
  | "pharmacode2"
  | "planet"
  | "plessey"
  | "posicode"
  | "postnet"
  | "pzn"
  | "qrcode"
  | "rationalizedCodabar"
  | "raw"
  | "rectangularmicroqrcode"
  | "royalmail"
  | "sscc18"
  | "swissqrcode"
  | "symbol"
  | "telepen"
  | "telepennumeric"
  | "ultracode"
  | "upca"
  | "upcacomposite"
  | "upce"
  | "upcecomposite";

export interface BarcodeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  type: BarcodeType;
  value?: string;
}

const baseClass = clsx("inline-block");

export const Barcode: Component<BarcodeProps> = (props) => {
  const [local, rest] = splitProps(props, ["type", "value", "class"]);
  let containerRef!: HTMLDivElement;

  createEffect(() => {
    const value = local.value;
    if (!value) {
      containerRef.innerHTML = "";
      return;
    }

    containerRef.innerHTML = bwipjs.toSVG({
      bcid: local.type,
      text: value,
    });
  });

  return <div data-barcode ref={containerRef} class={twMerge(baseClass, local.class)} {...rest} />;
};
```

**Step 2: index.ts에 export 추가**

`packages/solid/src/index.ts`의 display 섹션에 다음 라인을 추가한다:

```typescript
// display 섹션에 추가
export * from "./components/display/Barcode";
```

기존 display export(`Card`, `Icon`, `Label`, `Note`) 뒤에 추가한다.

**Step 3: 타입체크**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 4: 린트**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
pnpm lint packages/solid/src/components/display/Barcode.tsx
```

Expected: 에러 없음

**Step 5: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
git add packages/solid/src/components/display/Barcode.tsx packages/solid/src/index.ts
git commit -m "feat(solid): Barcode 컴포넌트 구현"
```

---

### Task 3: Barcode 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/display/Barcode.spec.tsx`

**Step 1: 테스트 파일 작성**

`packages/solid/tests/components/display/Barcode.spec.tsx`:

```tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Barcode } from "../../../src/components/display/Barcode";

describe("Barcode 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("data-barcode 속성으로 렌더링된다", () => {
      const { container } = render(() => <Barcode type="qrcode" value="test" />);
      expect(container.querySelector("[data-barcode]")).toBeTruthy();
    });

    it("value가 있으면 SVG가 렌더링된다", () => {
      const { container } = render(() => <Barcode type="qrcode" value="hello" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.querySelector("svg")).toBeTruthy();
    });

    it("value가 없으면 내용이 비어있다", () => {
      const { container } = render(() => <Barcode type="qrcode" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.innerHTML).toBe("");
    });
  });

  describe("반응성", () => {
    it("value 변경 시 SVG가 업데이트된다", () => {
      const [value, setValue] = createSignal("first");
      const { container } = render(() => <Barcode type="qrcode" value={value()} />);
      const el = container.querySelector("[data-barcode]")!;

      const firstSvg = el.innerHTML;
      setValue("second");
      const secondSvg = el.innerHTML;

      expect(firstSvg).not.toBe("");
      expect(secondSvg).not.toBe("");
      expect(firstSvg).not.toBe(secondSvg);
    });

    it("value가 빈 문자열로 변경되면 SVG가 제거된다", () => {
      const [value, setValue] = createSignal("hello");
      const { container } = render(() => <Barcode type="qrcode" value={value()} />);
      const el = container.querySelector("[data-barcode]")!;

      expect(el.querySelector("svg")).toBeTruthy();

      setValue("");
      expect(el.innerHTML).toBe("");
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Barcode type="qrcode" value="test" class="my-custom" />);
      const el = container.querySelector("[data-barcode]")!;
      expect(el.classList.contains("my-custom")).toBe(true);
    });
  });
});
```

**Step 2: 테스트 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
pnpm vitest packages/solid/tests/components/display/Barcode.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 3: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
git add packages/solid/tests/components/display/Barcode.spec.tsx
git commit -m "test(solid): Barcode 컴포넌트 테스트 추가"
```

---

### Task 4: 데모 페이지 추가

**Files:**

- Create: `packages/solid-demo/src/pages/display/BarcodePage.tsx`
- Modify: `packages/solid-demo/src/main.tsx` (Route 추가)
- Modify: `packages/solid-demo/src/pages/Home.tsx` (메뉴 추가)

**Step 1: 데모 페이지 작성**

`packages/solid-demo/src/pages/display/BarcodePage.tsx`:

```tsx
import { Barcode, Topbar } from "@simplysm/solid";

export default function BarcodePage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Barcode</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* QR Code */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">QR Code</h2>
            <Barcode type="qrcode" value="https://example.com" />
          </section>

          {/* Code 128 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Code 128</h2>
            <Barcode type="code128" value="SIMPLYSM-2026" />
          </section>

          {/* EAN-13 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">EAN-13</h2>
            <Barcode type="ean13" value="5901234123457" />
          </section>

          {/* Data Matrix */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">Data Matrix</h2>
            <Barcode type="datamatrix" value="Hello DataMatrix" />
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
```

**Step 2: main.tsx에 Route 추가**

`packages/solid-demo/src/main.tsx`에서 display 라우트 섹션(`/home/display/note` 뒤)에 추가:

```tsx
<Route path="/home/display/barcode" component={lazy(() => import("./pages/display/BarcodePage"))} />
```

**Step 3: Home.tsx 메뉴에 추가**

`packages/solid-demo/src/pages/Home.tsx`의 Display 메뉴 children 배열에 추가:

```typescript
{ title: "Barcode", href: "/home/display/barcode" },
```

**Step 4: 타입체크**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
pnpm typecheck packages/solid-demo
```

Expected: 에러 없음

**Step 5: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/barcode-component
git add packages/solid-demo/src/pages/display/BarcodePage.tsx packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): Barcode 데모 페이지 추가"
```
