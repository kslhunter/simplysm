import {
  type JSX,
  type ParentComponent,
  splitProps,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { createElementSize } from "@solid-primitives/resize-observer";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { mergeStyles } from "../../helpers/mergeStyles";

export interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * 콘텐츠 표시 여부. 기본값: false (닫힘)
   *
   * 접근성 참고:
   * - 토글 버튼에 `aria-expanded`와 `aria-controls`를 사용하세요.
   * - `Button` 컴포넌트를 사용하면 Enter/Space 키보드 접근성이 자동 지원됩니다.
   *
   * @example
   * ```tsx
   * <Button aria-expanded={open()} aria-controls="content" onClick={() => setOpen(!open())}>
   *   Toggle
   * </Button>
   * <Collapse id="content" open={open()}>Content</Collapse>
   * ```
   */
  open?: boolean;
}

const transitionClass = clsx(
  "transition-[margin-top]",
  "duration-200",
  "ease-out",
  "motion-reduce:transition-none",
);

export const Collapse: ParentComponent<CollapseProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style", "open"]);

  // 콘텐츠 요소 ref
  const [contentRef, setContentRef] = createSignal<HTMLDivElement>();

  // 콘텐츠 높이 추적
  const size = createElementSize(contentRef);

  // 초기 렌더링 시 transition 비활성화 (깜빡임 방지)
  // requestAnimationFrame으로 다음 프레임에 활성화
  const [mounted, setMounted] = createSignal(false);
  onMount(() => {
    const rafId = requestAnimationFrame(() => setMounted(true));
    onCleanup(() => cancelAnimationFrame(rafId));
  });

  // open이 undefined일 때 false로 처리
  const isOpen = () => local.open ?? false;

  // margin-top 계산
  const marginTop = () => (isOpen() ? undefined : `${-(size.height ?? 0)}px`);

  return (
    <div
      {...rest}
      data-collapse
      class={twMerge("block", local.class)}
      style={mergeStyles(local.style, { overflow: "hidden" })}
    >
      <div
        ref={setContentRef}
        class={mounted() ? transitionClass : ""}
        style={{
          "margin-top": marginTop(),
          // 닫힌 상태에서 포커스 가능 요소 접근 차단 및 FOUC 방지
          "visibility": !isOpen() ? "hidden" : undefined,
        }}
      >
        {local.children}
      </div>
    </div>
  );
};
