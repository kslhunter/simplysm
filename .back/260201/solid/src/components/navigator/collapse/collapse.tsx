import {
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  type ParentComponent,
  splitProps,
} from "solid-js";
import { collapse, type CollapseStyles } from "./collapse.css";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import { objPick } from "@simplysm/core-common";

/**
 * Collapse 컴포넌트의 props
 * @property open - 열림 상태
 */
export interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement>, CollapseStyles {
  open?: boolean;
}

/**
 * 높이 애니메이션으로 콘텐츠를 펼치거나 접는 컴포넌트
 *
 * - 열림/닫힘 상태에 따라 높이를 조절하여 콘텐츠를 표시하거나 숨긴다
 * - 열릴 때 콘텐츠 높이에 맞추어 애니메이션을 적용한다
 * - 열린 상태에서 콘텐츠 크기가 변경되면 자동으로 높이를 동기화한다
 *
 * `class`와 `style` props는 내부 콘텐츠 영역에 적용되고,
 * 그 외 props는 최외곽 요소에 적용된다.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = createSignal(false);
 *
 * <button onClick={() => setIsOpen(!isOpen())}>토글</button>
 * <Collapse open={isOpen()}>
 *   <p>접을 수 있는 콘텐츠</p>
 * </Collapse>
 * ```
 */
export const Collapse: ParentComponent<CollapseProps> = (props) => {
  const [local, styleProps, rest] = splitProps(
    props,
    [...collapse.variants(), "children", "open"],
    ["class", "style"],
  );

  let contentRef!: HTMLDivElement;

  // 초기 마운트 상태 추적 (마운트 전에는 애니메이션 없이 즉시 높이 설정)
  const [isMounted, setIsMounted] = createSignal(false);
  // 초기 open이 true면 "auto"로 시작하여 깜빡임 방지
  // eslint-disable-next-line solid/reactivity -- 초기값 설정에만 사용 (reactivity 불필요)
  const [height, setHeight] = createSignal<string>(local.open ? "auto" : "0px");
  const [contentHeight, setContentHeight] = createSignal<string>("0px");

  onMount(() => {
    // 초기 contentHeight 동기화 (ResizeObserver 콜백 전에 값 설정)
    setContentHeight(`${contentRef.scrollHeight}px`);

    // 초기 열림 상태일 경우 auto에서 정확한 px로 교체 (애니메이션 준비)
    if (local.open) {
      setHeight(`${contentRef.scrollHeight}px`);
    }

    createResizeObserver(contentRef, () => {
      setContentHeight(`${contentRef.scrollHeight}px`);
    });

    // 다음 프레임에서 마운트 완료 표시 (이후부터 애니메이션 적용)
    const rafId = requestAnimationFrame(() => setIsMounted(true));
    onCleanup(() => cancelAnimationFrame(rafId));
  });

  createEffect(() => {
    // 마운트 전에는 effect를 건너뛴다 (onMount에서 초기값 설정)
    if (!isMounted()) return;
    setHeight(local.open ? contentHeight() : "0px");
  });

  return (
    <div
      class={collapse(objPick(local, collapse.variants()))}
      style={{ height: height() }}
      data-collapsed={!local.open ? "" : undefined}
      {...rest}
    >
      <div {...styleProps} ref={contentRef}>
        {local.children}
      </div>
    </div>
  );
};
